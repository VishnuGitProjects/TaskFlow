const Project = require("../models/Project");
const crypto = require("crypto");

const generateUniqueInviteCode = async () => {
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await Project.findOne({ inviteCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/* ==========================
   CREATE PROJECT
========================== */

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      progress,
    } = req.body;

    const inviteCode = await generateUniqueInviteCode();

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      progress: progress || 0,
      members: [{ user: req.user._id, role: "owner" }],
      owner: req.user._id,
      inviteCode,
    });

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ==========================
   GET ALL PROJECTS
========================== */

const getProjects = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== "admin") {
      query.$or = [{ owner: req.user._id }, { "members.user": req.user._id }];
    }
    const projects = await Project.find(query)
      .populate("owner", "name email")
      .populate("members.user", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = req.project;

    const { name, description, status, priority, startDate, endDate, progress } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (progress !== undefined) project.progress = progress;

    await project.save();
    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = req.project;

    // Cascade delete tasks
    const Task = require("../models/Task");
    await Task.deleteMany({ project: project._id });

    // Cascade delete notifications
    const Notification = require("../models/Notification");
    await Notification.deleteMany({ relatedId: project._id });

    // Cascade delete activity logs
    const ActivityLog = require("../models/ActivityLog");
    await ActivityLog.deleteMany({ project: project._id });

    await project.deleteOne();

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addMemberToProject = async (req, res) => {
  try {
    const { email } = req.body;
    const project = req.project;

    // Validate email presence first
    if (!email || (typeof email === "string" && !email.trim())) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Trim email & test format before any DB queries or user creation
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const User = require("../models/User");
    let user = await User.findOne({ email: trimmedEmail.toLowerCase() });

    if (!user) {
      // Create a default name from email prefix
      const name = trimmedEmail.split("@")[0];
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("123456", 10);

      user = await User.create({
        name,
        email: trimmedEmail.toLowerCase(),
        password: hashedPassword,
        role: "team_member",
      });
    }

    // Add to project members if not already there
    const alreadyMember = project.members.some(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) === String(user._id);
    });
    if (!alreadyMember && String(project.owner) !== String(user._id)) {
      project.members.push({
        user: user._id,
        role: "member",
        joinedAt: new Date()
      });
      await project.save();

      const Notification = require("../models/Notification");
      await Notification.create({
        recipient: user._id,
        sender: req.user._id,
        type: "project_joined",
        title: "Added to Project",
        message: `You have been added as a member to the project "${project.name}".`,
        relatedId: project._id
      });
    }

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   REGENERATE INVITE CODE
========================== */
const regenerateInviteCode = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only project owner can regenerate the code
    if (String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to regenerate invite code for this project" });
    }

    const newCode = await generateUniqueInviteCode();
    project.inviteCode = newCode;
    await project.save();

    res.status(200).json({ inviteCode: newCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   JOIN PROJECT BY INVITE CODE
========================== */
const joinProjectByCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const project = await Project.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!project) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    // Prevent duplicate: check if user is owner or already a member
    const userIdStr = String(req.user._id);
    const isOwner = String(project.owner) === userIdStr;
    const isMember = project.members.some(m => String(m.user || m) === userIdStr);

    if (isOwner || isMember) {
      return res.status(400).json({ message: "You are already a member of this project" });
    }

    project.members.push({ user: req.user._id, role: "member" });
    await project.save();

    const Notification = require("../models/Notification");
    await Notification.create({
      recipient: project.owner,
      sender: req.user._id,
      type: "project_joined",
      title: "Member Joined Project",
      message: `${req.user.name} has joined your project "${project.name}" using the invite code.`,
      relatedId: project._id
    });

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const assignMemberRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = req.project;

    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and Role are required." });
    }

    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot modify your own role." });
    }

    const member = project.members.find(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) === String(userId);
    });
    if (!member) {
      return res.status(404).json({ message: "User is not a member of this project." });
    }

    if (role === "owner") {
      // Demote current owner to member role
      const currentOwnerMember = project.members.find(m => {
        const memberUserId = m.user?._id || m.user || m._id || m;
        return String(memberUserId) === String(req.user._id);
      });
      if (currentOwnerMember) {
        currentOwnerMember.role = "member";
      }
      project.owner = userId;
      member.role = "owner";

      // Log action
      const ActivityLog = require("../models/ActivityLog");
      await ActivityLog.create({
        project: project._id,
        user: req.user._id,
        action: "TRANSFER_OWNERSHIP",
        details: `Transferred project ownership to ${userId}.`,
      });
    } else {
      const oldRole = member.role;
      member.role = role;

      // Log action
      const ActivityLog = require("../models/ActivityLog");
      await ActivityLog.create({
        project: project._id,
        user: req.user._id,
        action: "ASSIGN_ROLE",
        details: `Changed role of user ${userId} from ${oldRole} to ${role}.`,
      });
    }

    await project.save();
    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const leaveProject = async (req, res) => {
  try {
    const project = req.project;

    project.members = project.members.filter(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) !== String(req.user._id);
    });
    await project.save();

    // Log action
    const ActivityLog = require("../models/ActivityLog");
    await ActivityLog.create({
      project: project._id,
      user: req.user._id,
      action: "LEAVE_PROJECT",
      details: `Left the project.`,
    });

    res.status(200).json({ message: "Left the project successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeMemberFromProject = async (req, res) => {
  try {
    const { userId } = req.params;
    const project = req.project;

    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot remove yourself from the project. Use Leave Project or Transfer Ownership instead." });
    }

    const isMember = project.members.some(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) === String(userId);
    });
    if (!isMember) {
      return res.status(404).json({ message: "User is not a member of this project." });
    }

    project.members = project.members.filter(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) !== String(userId);
    });
    await project.save();

    // Log action
    const ActivityLog = require("../models/ActivityLog");
    await ActivityLog.create({
      project: project._id,
      user: req.user._id,
      action: "REMOVE_MEMBER",
      details: `Removed user ${userId} from the project.`,
    });

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const transferProjectOwnership = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = req.project;

    if (!userId) {
      return res.status(400).json({ message: "Target user ID is required." });
    }

    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You are already the owner of this project." });
    }

    const member = project.members.find(m => String(m.user) === String(userId));
    if (!member) {
      return res.status(404).json({ message: "Target user is not a member of this project." });
    }

    // Demote current owner to member role
    const currentOwnerMember = project.members.find(m => String(m.user) === String(req.user._id));
    if (currentOwnerMember) {
      currentOwnerMember.role = "member";
    }

    // Promote target member to owner
    project.owner = userId;
    member.role = "owner";

    await project.save();

    // Log action
    const ActivityLog = require("../models/ActivityLog");
    await ActivityLog.create({
      project: project._id,
      user: req.user._id,
      action: "TRANSFER_OWNERSHIP",
      details: `Transferred project ownership to ${userId}.`,
    });

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectActivityLogs = async (req, res) => {
  try {
    const ActivityLog = require("../models/ActivityLog");
    const logs = await ActivityLog.find({ project: req.params.id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  addMemberToProject,
  regenerateInviteCode,
  joinProjectByCode,
  assignMemberRole,
  leaveProject,
  removeMemberFromProject,
  transferProjectOwnership,
  getProjectActivityLogs,
};
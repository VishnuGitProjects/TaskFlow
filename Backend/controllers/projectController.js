const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const Team = require("../models/Team");
const {
  PROJECT_MEMBER_ROLES,
  normalizeProjectRole,
} = require("../utils/roles");

const getGlobalRoleFromProjectRole = (projectRole) => {
  return projectRole === "project_manager" ? "project_manager" : "team_member";
};

const START_DATE_WINDOW_DAYS = 30;

const formatDateOnly = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateOnly = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const resolveProjectStartDate = (startDateValue) => {
  const today = getTodayDateOnly();
  const minimum = new Date(today);
  minimum.setDate(minimum.getDate() - START_DATE_WINDOW_DAYS);

  if (!startDateValue) {
    return today;
  }

  const parsed = new Date(startDateValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Start date is invalid.");
  }

  parsed.setHours(0, 0, 0, 0);
  if (parsed < minimum || parsed > today) {
    throw new Error(`Start date must be between ${formatDateOnly(minimum)} and ${formatDateOnly(today)}.`);
  }

  return parsed;
};

const calculateProjectProgress = async (projectId) => {
  const totalTasks = await Task.countDocuments({ project: projectId });
  if (totalTasks === 0) {
    return 0;
  }

  const completedTasks = await Task.countDocuments({
    project: projectId,
    status: "Completed",
  });

  return Math.round((completedTasks / totalTasks) * 100);
};

const syncProjectProgress = async (projectId) => {
  const progress = await calculateProjectProgress(projectId);
  await Project.findByIdAndUpdate(projectId, { progress });
  return progress;
};

const buildMembersFromTeamAndUsers = async ({ teamId, memberIds = [], ownerId }) => {
  const normalizedMemberIds = [...new Set((Array.isArray(memberIds) ? memberIds : []).map((id) => String(id)).filter(Boolean))];
  const users = await User.find({ _id: { $in: normalizedMemberIds } }).select("_id");
  const memberMap = new Map();

  users.forEach((user) => {
    if (String(user._id) !== String(ownerId)) {
      memberMap.set(String(user._id), {
        user: user._id,
        role: "member",
      });
    }
  });

  let team = null;
  if (teamId) {
    team = await Team.findById(teamId).populate("manager", "_id role").populate("members", "_id role");
    if (!team) {
      throw new Error("Assigned team not found.");
    }

    if (team.manager && String(team.manager._id) !== String(ownerId)) {
      memberMap.set(String(team.manager._id), {
        user: team.manager._id,
        role: "project_manager",
      });
    }

    (team.members || []).forEach((member) => {
      if (String(member._id) !== String(ownerId) && String(member._id) !== String(team.manager?._id || "")) {
        memberMap.set(String(member._id), {
          user: member._id,
          role: "member",
        });
      }
    });
  }

  return {
    team,
    members: Array.from(memberMap.values()),
  };
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
      members = [],
      team: teamId = null,
    } = req.body;

    const { members: normalizedMembers } = await buildMembersFromTeamAndUsers({
      teamId,
      memberIds: members,
      ownerId: req.user._id,
    });

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      startDate: resolveProjectStartDate(startDate),
      endDate,
      progress: 0,
      members: normalizedMembers,
      owner: req.user._id,
      team: teamId || null,
    });

    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");
    await project.populate("team", "name description");

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
      .populate("team", "name description manager members")
      .sort({ createdAt: -1 });

    await Promise.all(
      projects.map(async (project) => {
        project.progress = await syncProjectProgress(project._id);
      })
    );

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

    const { name, description, status, priority, startDate, endDate, members, team: teamId } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (startDate) project.startDate = resolveProjectStartDate(startDate);
    if (endDate) project.endDate = endDate;
    if (members !== undefined || teamId !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Only administrators can assign teams or reassign project members." });
      }
      const { members: normalizedMembers } = await buildMembersFromTeamAndUsers({
        teamId: teamId || null,
        memberIds: members !== undefined ? members : project.members.map((member) => member.user?._id || member.user),
        ownerId: project.owner,
      });
      project.members = normalizedMembers;
      project.team = teamId || null;
    }

    await project.save();
    project.progress = await syncProjectProgress(project._id);
    await project.populate("owner", "name email");
    await project.populate("members.user", "name email role");
    await project.populate("team", "name description");

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
    const { email, role } = req.body;
    const project = req.project;
    const normalizedProjectRole = normalizeProjectRole(role, "member");

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

    let user = await User.findOne({ email: trimmedEmail.toLowerCase() });

    if (!user) {
      const name = trimmedEmail.split("@")[0];
      user = await User.create({
        name,
        email: trimmedEmail.toLowerCase(),
        password: await require("bcryptjs").hash(crypto.randomBytes(12).toString("hex"), 10),
        role: getGlobalRoleFromProjectRole(normalizedProjectRole),
      });
    } else if (normalizedProjectRole === "project_manager" && user.role === "team_member") {
      user.role = "project_manager";
      await user.save();
    }

    const alreadyMember = project.members.some(m => {
      const memberUserId = m.user?._id || m.user || m._id || m;
      return String(memberUserId) === String(user._id);
    });
    if (!alreadyMember && String(project.owner) !== String(user._id)) {
      project.members.push({
        user: user._id,
        role: normalizedProjectRole,
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

const assignMemberRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = req.project;
    const normalizedRole = normalizeProjectRole(role, null);

    if (!userId || !role) {
      return res.status(400).json({ message: "User ID and Role are required." });
    }

    if (!normalizedRole || !PROJECT_MEMBER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid project role selected." });
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

    if (normalizedRole === "owner") {
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
      member.role = normalizedRole;

      // Log action
      const ActivityLog = require("../models/ActivityLog");
      await ActivityLog.create({
        project: project._id,
        user: req.user._id,
        action: "ASSIGN_ROLE",
        details: `Changed role of user ${userId} from ${oldRole} to ${normalizedRole}.`,
      });

      const memberUser = await User.findById(userId);
      if (memberUser && normalizedRole === "project_manager" && memberUser.role === "team_member") {
        memberUser.role = "project_manager";
        await memberUser.save();
      }
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

const getProjectById = async (req, res) => {
  try {
    const ActivityLog = require("../models/ActivityLog");

    const project = await Project.findById(req.params.id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role")
      .populate("team", "name description manager members");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Fetch tasks for stats
    const tasks = await Task.find({ project: project._id }).populate("assignedTo", "name email");

    // Calculate task stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "Completed").length;
    const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
    const reviewTasks = tasks.filter(t => t.status === "Review").length;
    const pendingTasks = tasks.filter(t => t.status === "To Do").length;
    const calculatedProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    if (project.progress !== calculatedProgress) {
      project.progress = calculatedProgress;
      await project.save();
    }

    // Fetch activity logs
    const activityLogs = await ActivityLog.find({ project: project._id })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    const attachments = [];
    tasks.forEach(t => {
      if (t.attachments && Array.isArray(t.attachments)) {
        t.attachments.forEach(file => {
          attachments.push({
            taskTitle: t.title,
            taskId: t._id,
            filename: file.filename,
            url: file.url,
            uploadedAt: file.uploadedAt
          });
        });
      }
    });

    res.status(200).json({
      project,
      role: req.projectRole, // from checkProjectPermission middleware
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        reviewTasks,
        pendingTasks,
        totalMembers: project.members.filter((member) => String(member.user?._id || member.user) !== String(project.owner?._id || project.owner)).length + 1
      },
      tasks,
      activityLogs,
      attachments
    });
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
  assignMemberRole,
  leaveProject,
  removeMemberFromProject,
  transferProjectOwnership,
  getProjectActivityLogs,
  getProjectById,
};

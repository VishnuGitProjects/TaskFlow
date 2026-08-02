const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const { GLOBAL_ROLES, normalizeGlobalRole } = require("../utils/roles");

const router = express.Router();

/* ===========================
   GET CURRENT LOGGED IN USER (ME)
=========================== */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GET ALL USERS
=========================== */
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role !== "admin") {
      const Project = require("../models/Project");
      const Team = require("../models/Team");

      const associatedUserIds = new Set();
      associatedUserIds.add(String(req.user._id));

      // Get users from all projects the logged-in user is involved in
      const projects = await Project.find({
        $or: [{ owner: req.user._id }, { "members.user": req.user._id }]
      });

      projects.forEach(p => {
        if (p.owner) associatedUserIds.add(String(p.owner));
        if (p.members) {
          p.members.forEach(m => {
            if (m.user) associatedUserIds.add(String(m.user));
          });
        }
      });

      // Get users from all teams the logged-in user is involved in
      const teams = await Team.find({
        $or: [
          { createdBy: req.user._id },
          { manager: req.user._id },
          { members: req.user._id }
        ]
      });

      teams.forEach(t => {
        if (t.createdBy) associatedUserIds.add(String(t.createdBy));
        if (t.manager) associatedUserIds.add(String(t.manager));
        if (t.members) {
          t.members.forEach(m => {
            associatedUserIds.add(String(m));
          });
        }
      });

      query = { _id: { $in: Array.from(associatedUserIds) } };
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GET SINGLE USER
=========================== */
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   CREATE / INVITE USER
=========================== */
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate email presence first
    if (!email || (typeof email === "string" && !email.trim())) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Trim email & test format before any DB queries or password hashing
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    // Check existing user AFTER format validation
    const existing = await User.findOne({ email: trimmedEmail.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }

    const finalName = (name && name.trim()) || trimmedEmail.split("@")[0];
    const finalPassword = password || crypto.randomBytes(8).toString("hex");
    const finalRole = role ? normalizeGlobalRole(role, null) : "team_member";

    if (!finalRole || !GLOBAL_ROLES.includes(finalRole)) {
      return res.status(400).json({ success: false, message: "Invalid role selected." });
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const user = await User.create({
      name: finalName,
      email: trimmedEmail.toLowerCase(),
      password: hashedPassword,
      role: finalRole,
    });

    // Simulate sending email invitation to developer console
    console.log(`\n=============================================`);
    console.log(`📧 EMAIL INVITATION SENT TO ${email.toLowerCase()}:`);
    console.log(`Subject: Added to TaskFlow Pro Workspace`);
    console.log(`Hello ${finalName},`);
    console.log(`You have been added to the workspace as a ${finalRole}.`);
    console.log(`Temporary Password: ${finalPassword}`);
    console.log(`Login here: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
    console.log(`=============================================\n`);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   UPDATE USER
=========================== */
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    // Check authorization: must be admin or the user themselves
    if (req.user.role !== "admin" && String(req.user._id) !== String(req.params.id)) {
      return res.status(403).json({ message: "Not authorized to update this user profile" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Non-admin users cannot change roles or active statuses
    if (req.user.role !== "admin") {
      if (role && role !== user.role) {
        return res.status(403).json({ message: "Not authorized to modify user roles" });
      }
      if (isActive !== undefined && isActive !== user.isActive) {
        return res.status(403).json({ message: "Not authorized to modify active status" });
      }
    }

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email is already taken by another user." });
      }
      user.email = email.toLowerCase();
    }
    if (role && req.user.role === "admin") {
      const normalizedRole = normalizeGlobalRole(role, null);
      if (!normalizedRole || !GLOBAL_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ message: "Invalid role selected." });
      }
      user.role = normalizedRole;
    }
    if (isActive !== undefined && req.user.role === "admin") user.isActive = isActive;

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   DELETE USER
=========================== */
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Find all projects owned by the user and cascade delete them
    const Project = require("../models/Project");
    const Task = require("../models/Task");
    const Notification = require("../models/Notification");
    const ActivityLog = require("../models/ActivityLog");

    const ownedProjects = await Project.find({ owner: userId });
    for (const proj of ownedProjects) {
      await Task.deleteMany({ project: proj._id });
      await Notification.deleteMany({ relatedId: proj._id });
      await ActivityLog.deleteMany({ project: proj._id });
      await proj.deleteOne();
    }

    // 2. Remove user from members list of other projects
    await Project.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // 3. Delete teams created by the user, pull from other teams, set manager null
    const Team = require("../models/Team");
    await Team.deleteMany({ createdBy: userId });
    await Team.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );
    await Team.updateMany(
      { manager: userId },
      { $set: { manager: null } }
    );

    // 4. Unassign tasks assigned to the user in other projects
    await Task.updateMany(
      { assignedTo: userId },
      { $set: { assignedTo: null } }
    );

    // 5. Delete user notifications and activity logs
    await Notification.deleteMany({ recipient: userId });
    await Notification.deleteMany({ sender: userId });
    await ActivityLog.deleteMany({ user: userId });

    // 6. Permanently delete the user document
    await user.deleteOne();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   ACTIVATE / DEACTIVATE USER
=========================== */
router.patch("/:id/toggle-status", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;

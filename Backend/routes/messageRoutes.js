const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Message = require("../models/Message");
const ProjectRead = require("../models/ProjectRead");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// Get unread counts for all user projects
router.get("/unread/count", protect, async (req, res) => {
  try {
    // Find all projects user belongs to
    const userProjects = await Project.find({
      $or: [
        { owner: req.user._id },
        { "members.user": req.user._id }
      ]
    });

    const readStatuses = await ProjectRead.find({ userId: req.user._id });
    let totalUnread = 0;
    const projectUnreads = {};

    for (const proj of userProjects) {
      const status = readStatuses.find(r => String(r.projectId) === String(proj._id));
      const lastReadAt = status ? status.lastReadAt : new Date(0);

      const count = await Message.countDocuments({
        projectId: proj._id,
        senderId: { $ne: req.user._id },
        createdAt: { $gt: lastReadAt }
      });

      projectUnreads[proj._id] = count;
      totalUnread += count;
    }

    return res.status(200).json({ totalUnread, projectUnreads });
  } catch (error) {
    console.error("Unread count error:", error);
    return res.status(500).json({ success: false, message: "Error calculating unread counts." });
  }
});

// Get messages for a project
router.get("/:projectId", protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const isMember =
      req.user.role === "admin" ||
      String(project.owner) === String(req.user._id) ||
      project.members.some((m) => String(m.user) === String(req.user._id));

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. You are not a member of this project." });
    }

    // Mark messages as read by updating/upserting user's lastReadAt for this project
    await ProjectRead.findOneAndUpdate(
      { userId: req.user._id, projectId },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );

    // Mark notifications of type "new_message" for this project as read
    await Notification.updateMany(
      { recipient: req.user._id, relatedId: projectId, type: "new_message", isRead: false },
      { isRead: true }
    );

    const messages = await Message.find({ projectId }).sort({ createdAt: 1 });
    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get Messages Error:", error);
    return res.status(500).json({ success: false, message: "Server error fetching messages." });
  }
});

// Post a message in a project
router.post("/:projectId", protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const isMember =
      req.user.role === "admin" ||
      String(project.owner) === String(req.user._id) ||
      project.members.some((m) => String(m.user) === String(req.user._id));

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied. You are not a member of this project." });
    }

    const newMessage = new Message({
      projectId,
      senderId: req.user._id,
      senderName: req.user.name,
      message: message.trim(),
    });

    await newMessage.save();

    // Mark messages as read for the sender
    await ProjectRead.findOneAndUpdate(
      { userId: req.user._id, projectId },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );

    // Create a notification for all other project members
    const recipients = [];
    if (String(project.owner) !== String(req.user._id)) {
      recipients.push(String(project.owner));
    }
    project.members.forEach((m) => {
      if (m.user && String(m.user) !== String(req.user._id)) {
        const memberIdStr = String(m.user._id || m.user);
        if (!recipients.includes(memberIdStr)) {
          recipients.push(memberIdStr);
        }
      }
    });

    for (const recId of recipients) {
      const notif = new Notification({
        recipient: recId,
        sender: req.user._id,
        type: "new_message",
        title: "New Message",
        message: `${req.user.name} sent a new message in ${project.name}.`,
        relatedId: project._id,
      });
      await notif.save();
    }

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("Post Message Error:", error);
    return res.status(500).json({ success: false, message: "Server error sending message." });
  }
});

module.exports = router;

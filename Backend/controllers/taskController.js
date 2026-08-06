const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { canManageTasksForProject } = require("../utils/roles");

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const recalculateProjectProgress = async (projectId) => {
  const totalTasks = await Task.countDocuments({ project: projectId });
  let progress = 0;

  if (totalTasks > 0) {
    const completedTasks = await Task.countDocuments({
      project: projectId,
      status: "Completed",
    });
    progress = Math.round((completedTasks / totalTasks) * 100);
  }

  await Project.findByIdAndUpdate(projectId, { progress });
  return progress;
};

const getTaskProgressFromStatus = (status) => {
  switch (status) {
    case "Completed":
      return 100;
    case "Review":
      return 85;
    case "In Progress":
      return 50;
    case "To Do":
    default:
      return 0;
  }
};

const getProjectMemberRole = (projectDoc, userId) => {
  if (String(projectDoc.owner) === String(userId)) {
    return "owner";
  }

  const member = projectDoc.members.find((entry) => {
    const memberUserId = entry.user?._id || entry.user || entry._id || entry;
    return String(memberUserId) === String(userId);
  });

  return member?.role || null;
};

const isProjectMember = (projectDoc, userId) => {
  if (!projectDoc) return false;
  if (String(projectDoc.owner) === String(userId)) {
    return true;
  }

  return projectDoc.members.some((entry) => {
    const memberUserId = entry.user?._id || entry.user || entry._id || entry;
    return String(memberUserId) === String(userId);
  });
};

const canViewTask = (task, projectDoc, user) => {
  if (user.role === "admin") return true;
  const projectRole = getProjectMemberRole(projectDoc, user._id);
  if (!projectRole) return false;
  if (canManageTasksForProject(projectRole)) return true;
  return String(task.assignedTo) === String(user._id);
};

const populateTaskDetails = async (taskDoc) =>
  taskDoc.populate([
    { path: "assignedTo", select: "name email avatar role" },
    { path: "project", select: "name status" },
    { path: "createdBy", select: "name email role" },
    { path: "attachments.uploadedBy", select: "name email role" },
    { path: "comments.author", select: "name email role avatar" },
    { path: "comments.replies.author", select: "name email role avatar" },
  ]);

/* ==========================
   CREATE TASK
========================== */
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, project, assignedTo, progress } = req.body;

    if (!project) {
      return res.status(400).json({ message: "Project ID is required." });
    }

    // Check project-level permission
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectRole = getProjectMemberRole(projectDoc, req.user._id);
    if (req.user.role !== "admin" && !canManageTasksForProject(projectRole)) {
      return res.status(403).json({ message: "Access denied. Only administrators and project managers can create tasks." });
    }

    if (assignedTo) {
      const assigneeExists = await User.findById(assignedTo);
      if (!assigneeExists) {
        return res.status(400).json({ message: "Assignee user not found." });
      }
      const isAssigneeOwner = String(projectDoc.owner) === String(assignedTo);
      const isAssigneeMember = projectDoc.members.some(m => {
        const memberUserId = m.user?._id || m.user || m._id || m;
        return String(memberUserId) === String(assignedTo);
      });
      if (!isAssigneeOwner && !isAssigneeMember) {
        return res.status(400).json({ message: "Assignee must be a member of the project." });
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      assignedTo: assignedTo || null,
      progress: progress !== undefined ? progress : getTaskProgressFromStatus(status),
      createdBy: req.user._id,
    });

    await recalculateProjectProgress(project);

    // Populate for response
    await populateTaskDetails(task);

    if (task.assignedTo) {
      const Notification = require("../models/Notification");
      await Notification.create({
        recipient: task.assignedTo._id,
        sender: req.user._id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned the task "${task.title}".`,
        relatedId: task._id
      });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   GET ALL TASKS (filtered by project or assigned user)
========================== */
const getTasks = async (req, res) => {
  try {
    const { projectId, assignedTo, status } = req.query;

    // Build dynamic filter
    const filter = {};

    if (projectId) {
      const projectDoc = await Project.findById(projectId);
      if (!projectDoc) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (req.user.role !== "admin" && !isProjectMember(projectDoc, req.user._id)) {
        return res.status(403).json({ message: "Access denied. You are not a member of this project." });
      }
      filter.project = projectId;
    } else {
      // If no project specified, restrict non-admins to tasks in their projects
      if (req.user.role !== "admin") {
        const myProjects = await Project.find({
          $or: [{ owner: req.user._id }, { "members.user": req.user._id }]
        });
        const myProjectIds = myProjects.map(p => p._id);
        filter.project = { $in: myProjectIds };
      }
    }

    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    if (req.user.role === "team_member") {
      filter.assignedTo = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email avatar role")
      .populate("project", "name status")
      .populate("createdBy", "name email role")
      .populate("attachments.uploadedBy", "name email role")
      .populate("comments.author", "name email role avatar")
      .populate("comments.replies.author", "name email role avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   GET SINGLE TASK
========================== */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email avatar role")
      .populate("project", "name status")
      .populate("createdBy", "name email role")
      .populate("attachments.uploadedBy", "name email role")
      .populate("comments.author", "name email role avatar")
      .populate("comments.replies.author", "name email role avatar");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check project membership
    const projectDoc = await Project.findById(task.project);
    if (!projectDoc && req.user.role !== "admin") {
      return res.status(404).json({ message: "Project associated with this task not found" });
    }
    if (!canViewTask(task, projectDoc, req.user)) {
      return res.status(403).json({ message: "Access denied. You do not have access to this task." });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   UPDATE TASK
========================== */
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check project-level permission
    const projectDoc = await Project.findById(task.project);
    if (!projectDoc) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectRole = getProjectMemberRole(projectDoc, req.user._id);

    if (req.user.role !== "admin" && !projectRole) {
      return res.status(403).json({ message: "Access denied. You do not have access to this project." });
    }

    const canManageTask = req.user.role === "admin" || canManageTasksForProject(projectRole);

    if (!canManageTask) {
      // Regular member: can only update status/progress of their own tasks
      if (String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized to edit this task as it is not assigned to you" });
      }
      const { status, progress } = req.body;
      if (status) task.status = status;
      task.progress = progress !== undefined ? progress : getTaskProgressFromStatus(task.status);
    } else {
      // Owner/Admin: can update everything
      const { title, description, status, priority, dueDate, assignedTo, progress } = req.body;
      
      if (assignedTo) {
        const assigneeExists = await User.findById(assignedTo);
        if (!assigneeExists) {
          return res.status(400).json({ message: "Assignee user not found." });
        }
        const isAssigneeOwner = String(projectDoc.owner) === String(assignedTo);
        const isAssigneeMember = projectDoc.members.some(m => {
          const memberUserId = m.user?._id || m.user || m._id || m;
          return String(memberUserId) === String(assignedTo);
        });
        if (!isAssigneeOwner && !isAssigneeMember) {
          return res.status(400).json({ message: "Assignee must be a member of the project." });
        }
      }

      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      task.progress = progress !== undefined ? progress : getTaskProgressFromStatus(task.status);
    }

    const oldAssignedTo = task.assignedTo ? String(task.assignedTo) : null;

    const updated = await task.save();
    await recalculateProjectProgress(updated.project);
    await populateTaskDetails(updated);

    const newAssignedTo = updated.assignedTo ? String(updated.assignedTo._id || updated.assignedTo) : null;
    if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
      const Notification = require("../models/Notification");
      await Notification.create({
        recipient: updated.assignedTo._id || updated.assignedTo,
        sender: req.user._id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `You have been assigned the task "${updated.title}".`,
        relatedId: updated._id
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addTaskAttachment = async (req, res) => {
  try {
    const { filename, url, mimeType, size } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const projectDoc = await Project.findById(task.project);
    if (!projectDoc || !canViewTask(task, projectDoc, req.user)) {
      return res.status(403).json({ message: "Access denied. You cannot upload attachments to this task." });
    }

    if (!filename || !filename.trim() || !url || !url.trim()) {
      return res.status(400).json({ message: "Filename and file data are required." });
    }

    const normalizedMimeType = (mimeType || "").toLowerCase();
    if (!ALLOWED_ATTACHMENT_TYPES.includes(normalizedMimeType)) {
      return res.status(400).json({ message: "Only PDF, DOC, DOCX, JPG, and PNG attachments are supported." });
    }

    task.attachments.push({
      filename: filename.trim(),
      url: url.trim(),
      mimeType: normalizedMimeType,
      size: Number(size) || 0,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    await task.save();
    await populateTaskDetails(task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addTaskComment = async (req, res) => {
  try {
    const { message } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const projectDoc = await Project.findById(task.project);
    if (!projectDoc || !canViewTask(task, projectDoc, req.user)) {
      return res.status(403).json({ message: "Access denied. You cannot comment on this task." });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Comment message is required." });
    }

    task.comments.push({
      author: req.user._id,
      message: message.trim(),
      createdAt: new Date(),
      replies: [],
    });

    await task.save();
    await populateTaskDetails(task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const replyToTaskComment = async (req, res) => {
  try {
    const { message } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const projectDoc = await Project.findById(task.project);
    if (!projectDoc || !canViewTask(task, projectDoc, req.user)) {
      return res.status(403).json({ message: "Access denied. You cannot reply to comments on this task." });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Reply message is required." });
    }

    const comment = task.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    comment.replies.push({
      author: req.user._id,
      message: message.trim(),
      createdAt: new Date(),
    });

    await task.save();
    await populateTaskDetails(task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   DELETE TASK
========================== */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check project-level permission
    const projectDoc = await Project.findById(task.project);
    const projectRole = projectDoc ? getProjectMemberRole(projectDoc, req.user._id) : null;

    if (req.user.role !== "admin" && !canManageTasksForProject(projectRole)) {
      return res.status(403).json({ message: "Not authorized to delete this task. Only project owners or project managers can delete tasks." });
    }

    const projectId = task.project;
    await task.deleteOne();
    await recalculateProjectProgress(projectId);

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskAttachment,
  addTaskComment,
  replyToTaskComment,
};

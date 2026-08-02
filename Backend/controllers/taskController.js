const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { canManageTasksForProject } = require("../utils/roles");

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
      return res.status(403).json({ message: "Access denied. Only project owners or project managers can create tasks." });
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
      progress: progress || 0,
      createdBy: req.user._id,
    });

    // Populate for response
    await task.populate("assignedTo", "name email");
    await task.populate("project", "name");

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
      // Validate that user is member of project
        const projectDoc = await Project.findById(projectId);
      if (!projectDoc) {
        return res.status(404).json({ message: "Project not found" });
      }
      const isOwner = String(projectDoc.owner) === String(req.user._id);
      const isMember = projectDoc.members.some(m => String(m.user) === String(req.user._id));
      if (req.user.role !== "admin" && !isOwner && !isMember) {
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

    // Team members only see tasks assigned to them or created by them if querying all projects
    if (req.user.role === "team_member" && !projectId) {
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email avatar")
      .populate("project", "name status")
      .populate("createdBy", "name")
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
      .populate("assignedTo", "name email avatar")
      .populate("project", "name status")
      .populate("createdBy", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check project membership
    const projectDoc = await Project.findById(task.project);
    if (!projectDoc && req.user.role !== "admin") {
      return res.status(404).json({ message: "Project associated with this task not found" });
    }
    const isOwner = projectDoc && String(projectDoc.owner) === String(req.user._id);
    const isMember = projectDoc && projectDoc.members.some(m => String(m.user) === String(req.user._id));
    if (req.user.role !== "admin" && !isOwner && !isMember) {
      return res.status(403).json({ message: "Access denied. You do not have access to this task's project." });
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
      if (progress !== undefined) task.progress = progress;
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
      if (dueDate) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (progress !== undefined) task.progress = progress;
    }

    const oldAssignedTo = task.assignedTo ? String(task.assignedTo) : null;

    const updated = await task.save();
    await updated.populate("assignedTo", "name email");

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

    await task.deleteOne();

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
};

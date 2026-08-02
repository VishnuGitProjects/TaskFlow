const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskAttachment,
  addTaskComment,
  replyToTaskComment,
} = require("../controllers/taskController");

const { protect, authorize } = require("../middleware/authMiddleware");

// GET all tasks (all roles — filtered by role in controller)
router.get("/", protect, getTasks);

// GET single task
router.get("/:id", protect, getTaskById);

// CREATE task
router.post("/", protect, createTask);

// UPDATE task
router.put("/:id", protect, updateTask);

// DELETE task
router.delete("/:id", protect, deleteTask);

// Attachments
router.post("/:id/attachments", protect, addTaskAttachment);

// Comments and replies
router.post("/:id/comments", protect, addTaskComment);
router.post("/:id/comments/:commentId/replies", protect, replyToTaskComment);

module.exports = router;

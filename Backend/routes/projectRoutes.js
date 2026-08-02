const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/projectController");

const { protect, authorize, checkProjectPermission } = require("../middleware/authMiddleware");

// Create Project
router.post("/", protect, authorize("admin"), createProject);

// Get All Projects
router.get("/", protect, getProjects);

// Get Project by ID
router.get("/:id", protect, checkProjectPermission("view_project"), getProjectById);

// Update Project
router.put("/:id", protect, checkProjectPermission("edit_project"), updateProject);

// Delete Project
router.delete("/:id", protect, checkProjectPermission("delete_project"), deleteProject);

// Add Member to Project by Email
router.post("/:id/members", protect, checkProjectPermission("invite_members"), addMemberToProject);

// Assign Member Role
router.post("/:id/members/role", protect, checkProjectPermission("assign_roles"), assignMemberRole);

// Leave Project
router.post("/:id/leave", protect, checkProjectPermission("leave_project"), leaveProject);

// Remove Member
router.delete("/:id/members/:userId", protect, checkProjectPermission("remove_members"), removeMemberFromProject);

// Transfer Ownership
router.post("/:id/transfer-ownership", protect, checkProjectPermission("transfer_ownership"), transferProjectOwnership);

// Get Project Activity Logs
router.get("/:id/activity", protect, checkProjectPermission("view_project"), getProjectActivityLogs);

module.exports = router;

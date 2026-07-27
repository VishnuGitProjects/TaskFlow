const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/projectController");

const { protect, checkProjectPermission } = require("../middleware/authMiddleware");

// Join Project by Invite Code (registered before /:id)
router.post("/join", protect, joinProjectByCode);

// Create Project
router.post("/", protect, createProject);

// Get All Projects
router.get("/", protect, getProjects);

// Update Project
router.put("/:id", protect, checkProjectPermission("edit_project"), updateProject);

// Delete Project
router.delete("/:id", protect, checkProjectPermission("delete_project"), deleteProject);

// Add Member to Project by Email
router.post("/:id/members", protect, checkProjectPermission("invite_members"), addMemberToProject);

// Regenerate Invite Code
router.post("/:id/regenerate-code", protect, checkProjectPermission("regenerate_join_code"), regenerateInviteCode);

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
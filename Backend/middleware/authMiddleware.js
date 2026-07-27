const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* ===================================
   PROTECT — Verify JWT token
=================================== */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found." });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: "Account is deactivated." });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized. Invalid token." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }
};

/* ===================================
   ROLE GUARD — Restrict by role
   Usage: authorize("admin", "project_manager")
=================================== */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

/* ===================================
   checkProjectPermission — Check Project RBAC
=================================== */
const checkProjectPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId || req.body.project;
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required." });
      }

      const Project = require("../models/Project");
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found." });
      }

      // Check if user is global admin (Admins bypass all checks)
      if (req.user && req.user.role === "admin") {
        req.project = project;
        req.projectRole = "owner";
        return next();
      }

      // Find user's role in this project
      let userRole = null;
      if (String(project.owner?._id || project.owner) === String(req.user._id)) {
        userRole = "owner";
      } else {
        const member = project.members.find(m => {
          const memberUserId = m.user?._id || m.user || m._id || m;
          return String(memberUserId) === String(req.user._id);
        });
        if (member) {
          userRole = member.role || "member";
        }
      }

      if (!userRole) {
        return res.status(403).json({ message: "Access denied. You are not a member of this project." });
      }

      // Define Permission Matrix
      const permissionMatrix = {
        owner: [
          "view_project", "edit_project", "delete_project", "remove_members",
          "assign_roles", "invite_members", "generate_join_code", "regenerate_join_code",
          "create_tasks", "edit_all_tasks", "delete_tasks", "manage_reports", "manage_settings",
          "transfer_ownership", "leave_project"
        ],
        admin: [
          "view_project", "edit_project", "delete_project", "remove_members",
          "assign_roles", "invite_members", "generate_join_code", "regenerate_join_code",
          "create_tasks", "edit_all_tasks", "delete_tasks", "manage_reports", "manage_settings",
          "leave_project"
        ],
        project_manager: [
          "view_project", "edit_project", "remove_members", "invite_members",
          "create_tasks", "edit_all_tasks", "delete_tasks", "manage_reports", "leave_project"
        ],
        developer: [
          "view_project", "create_tasks", "edit_own_tasks", "leave_project"
        ],
        designer: [
          "view_project", "create_tasks", "edit_own_tasks", "leave_project"
        ],
        qa: [
          "view_project", "create_tasks", "edit_own_tasks", "leave_project"
        ],
        member: [
          "view_project", "leave_project", "create_tasks", "edit_own_tasks"
        ]
      };

      const allowedPermissions = permissionMatrix[userRole] || [];
      if (!allowedPermissions.includes(requiredPermission)) {
        return res.status(403).json({ message: `Access denied. You do not have permission to ${requiredPermission.replace(/_/g, " ")}.` });
      }

      req.project = project;
      req.projectRole = userRole;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error checking permissions." });
    }
  };
};

module.exports = { protect, authorize, checkProjectPermission };
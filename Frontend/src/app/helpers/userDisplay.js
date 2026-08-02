import { APP_ROLES, normalizeRole } from "../config/roles";

export const getRoleLabel = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === APP_ROLES.ADMIN) return "Administrator";
  if (normalizedRole === APP_ROLES.PROJECT_MANAGER) return "Project Manager";
  return "Team Member";
};

export const getRoleBadgeClass = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === APP_ROLES.ADMIN) return "admin";
  if (normalizedRole === APP_ROLES.PROJECT_MANAGER) return "manager";
  return "member";
};

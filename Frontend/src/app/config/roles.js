export const APP_ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  TEAM_MEMBER: "team_member",
};

export const normalizeRole = (role) => {
  if (!role || typeof role !== "string") {
    return APP_ROLES.TEAM_MEMBER;
  }

  const normalized = role.trim().toLowerCase().replace(/\s+/g, "_");

  if (normalized === "administrator") return APP_ROLES.ADMIN;
  if (normalized === "manager") return APP_ROLES.PROJECT_MANAGER;
  if (normalized === "member") return APP_ROLES.TEAM_MEMBER;

  return normalized;
};

export const normalizeUser = (user) => {
  if (!user) return null;

  return {
    ...user,
    role: normalizeRole(user.role),
  };
};

export const hasRequiredRole = (userRole, allowedRoles = []) => {
  if (!allowedRoles.length) return true;
  return allowedRoles.includes(normalizeRole(userRole));
};

export const isAdminRole = (role) => normalizeRole(role) === APP_ROLES.ADMIN;
export const isProjectManagerRole = (role) => normalizeRole(role) === APP_ROLES.PROJECT_MANAGER;
export const isTeamMemberRole = (role) => normalizeRole(role) === APP_ROLES.TEAM_MEMBER;

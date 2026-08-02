const GLOBAL_ROLES = ["admin", "project_manager", "team_member"];

const PROJECT_MEMBER_ROLES = [
  "owner",
  "admin",
  "project_manager",
  "developer",
  "designer",
  "qa",
  "member",
];

const normalizeGlobalRole = (role, fallback = "team_member") => {
  if (!role || typeof role !== "string") {
    return fallback;
  }

  const normalized = role.trim().toLowerCase();
  if (GLOBAL_ROLES.includes(normalized)) {
    return normalized;
  }

  if (normalized === "member" || normalized === "developer" || normalized === "designer" || normalized === "qa") {
    return "team_member";
  }

  return fallback;
};

const normalizeProjectRole = (role, fallback = "member") => {
  if (!role || typeof role !== "string") {
    return fallback;
  }

  const normalized = role.trim().toLowerCase().replace(/\s+/g, "_");
  if (PROJECT_MEMBER_ROLES.includes(normalized)) {
    return normalized;
  }

  if (normalized === "team_member") {
    return "member";
  }

  return fallback;
};

const canManageTasksForProject = (projectRole) => {
  return ["owner", "admin", "project_manager"].includes(projectRole);
};

module.exports = {
  GLOBAL_ROLES,
  PROJECT_MEMBER_ROLES,
  normalizeGlobalRole,
  normalizeProjectRole,
  canManageTasksForProject,
};

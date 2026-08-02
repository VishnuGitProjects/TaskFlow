import { isAdminRole } from "../config/roles";

export const PROJECT_MANAGEMENT_ROLES = ["owner", "admin", "project_manager"];

export const getProjectMemberRole = (project, user) => {
  if (!project || !user) return null;

  if (isAdminRole(user.role)) {
    return "owner";
  }

  const userId = String(user._id || user.id || "");
  const ownerId = String(project.owner?._id || project.owner || "");

  if (ownerId === userId) {
    return "owner";
  }

  const membership = (project.members || []).find((member) => {
    const memberUserId = member.user?._id || member.user || member._id || member;
    return String(memberUserId) === userId;
  });

  return membership?.role || null;
};

export const canManageProject = (project, user) => {
  const role = getProjectMemberRole(project, user);
  return PROJECT_MANAGEMENT_ROLES.includes(role);
};

export const canInviteProjectMembers = (project, user) => canManageProject(project, user);

export const canDeleteProject = (project, user) => {
  const role = getProjectMemberRole(project, user);
  return ["owner", "admin"].includes(role);
};

export const canRegenerateInviteCode = (project, user) => {
  const role = getProjectMemberRole(project, user);
  return ["owner", "admin"].includes(role);
};

export const getAssignedProjectManager = (project) => {
  const managerMember = (project?.members || []).find((member) => member.role === "project_manager");
  return managerMember?.user || project?.owner || null;
};

export const getVisibleProjectMembers = (project) => {
  const ownerId = String(project?.owner?._id || project?.owner || "");

  return (project?.members || []).filter(
    (member) => String(member.user?._id || member.user || "") !== ownerId
  );
};

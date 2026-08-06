import { APP_ROLES } from "./roles";

export const APP_NAVIGATION = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "projects", label: "Projects", path: "/projects" },
  { key: "tasks", label: "Tasks", path: "/tasks" },
  { key: "teams", label: "Team Management", path: "/teams", roles: [APP_ROLES.ADMIN] },
  { key: "users", label: "User Management", path: "/users", roles: [APP_ROLES.ADMIN] },
  { key: "progress", label: "Progress Tracking", path: "/progress" },
  { key: "reports", label: "Reports", path: "/reports", roles: [APP_ROLES.ADMIN, APP_ROLES.PROJECT_MANAGER] },
  { key: "settings", label: "Settings", path: "/settings", roles: [APP_ROLES.ADMIN] },
];

export const SEARCHABLE_NAVIGATION = APP_NAVIGATION.map(({ label, path, roles }) => ({
  name: label,
  path,
  roles,
}));

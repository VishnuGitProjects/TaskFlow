import Login from "../../pages/Auth/Login";
import Signup from "../../pages/Auth/Signup";
import ResetPassword from "../../pages/Auth/ResetPassword";
import Dashboard from "../../pages/Dashboard/Dashboard";
import Projects from "../../pages/Projects/Projects";
import ProjectDetails from "../../pages/Projects/ProjectDetails";
import Tasks from "../../pages/Tasks/Tasks";
import Teams from "../../pages/Teams/Teams";
import Users from "../../pages/Users/Users";
import Calendar from "../../pages/Calendar/Calendar";
import Reports from "../../pages/Reports/Reports";
import Settings from "../../pages/Settings/Settings";
import Progress from "../../pages/Progress/Progress";
import Messages from "../../pages/Messages/Messages";
import { APP_ROLES } from "../config/roles";

export const PUBLIC_ROUTES = [
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup /> },
  { path: "/reset-password", element: <ResetPassword /> },
];

export const PROTECTED_ROUTES = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/projects", element: <Projects /> },
  { path: "/projects/:id", element: <ProjectDetails /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/calendar", element: <Calendar /> },
  { path: "/settings", element: <Settings /> },
  { path: "/progress", element: <Progress /> },
  { path: "/messages", element: <Messages /> },
];

export const ROLE_PROTECTED_ROUTES = [
  { path: "/reports", element: <Reports />, roles: [APP_ROLES.ADMIN, APP_ROLES.PROJECT_MANAGER] },
  { path: "/teams", element: <Teams />, roles: [APP_ROLES.ADMIN] },
  { path: "/users", element: <Users />, roles: [APP_ROLES.ADMIN] },
];

import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

// Auth pages
import Login         from "../pages/Auth/Login";
import Signup        from "../pages/Auth/Signup";
import ResetPassword  from "../pages/Auth/ResetPassword";

// App pages
import Dashboard from "../pages/Dashboard/Dashboard";
import Projects  from "../pages/Projects/Projects";
import ProjectDetails from "../pages/Projects/ProjectDetails";
import Tasks     from "../pages/Tasks/Tasks";
import Teams     from "../pages/Teams/Teams";
import Users     from "../pages/Users/Users";
import Calendar  from "../pages/Calendar/Calendar";
import Reports   from "../pages/Reports/Reports";
import Settings  from "../pages/Settings/Settings";
import Progress  from "../pages/Progress/Progress";
import Messages  from "../pages/Messages/Messages";

function AppRoutes() {
  return (
    <Routes>

      {/* ── Public Routes (Auth) ─────────────────────── */}
      <Route path="/"                element={<Login />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<Signup />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* ── Protected Routes (any logged-in user) ──── */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects"  element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/tasks"     element={<Tasks />} />
        <Route path="/calendar"  element={<Calendar />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/progress"  element={<Progress />} />
        <Route path="/reports"  element={<Reports />} />
        <Route path="/users"    element={<Users />} />
        <Route path="/messages" element={<Messages />} />
      </Route>

      {/* ── Admin + Project Manager only ─────────────── */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "project_manager"]} />}>
        <Route path="/teams"    element={<Teams />} />
      </Route>

    </Routes>
  );
}

export default AppRoutes;
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute
 *
 * Props:
 *  - allowedRoles: string[] — optional. If provided, only those roles can access.
 *    e.g. allowedRoles={["admin"]}
 *    e.g. allowedRoles={["admin", "project_manager"]}
 *
 * If no allowedRoles passed, any authenticated user can access.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // 0. Wait for authentication verification to complete
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "sans-serif",
        fontSize: "16px"
      }}>
        Loading session...
      </div>
    );
  }

  // 1. Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 2. Logged in but wrong role → redirect to dashboard (access denied)
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. All good → render child routes
  return <Outlet />;
};

export default ProtectedRoute;

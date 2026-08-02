import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import { PROTECTED_ROUTES, PUBLIC_ROUTES, ROLE_PROTECTED_ROUTES } from "../app/routes/routeConfig";

function AppRoutes() {
  return (
    <Routes>
      {PUBLIC_ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      <Route element={<ProtectedRoute />}>
        {PROTECTED_ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Route>

      {ROLE_PROTECTED_ROUTES.map((route) => (
        <Route key={route.path} element={<ProtectedRoute allowedRoles={route.roles} />}>
          <Route path={route.path} element={route.element} />
        </Route>
      ))}
    </Routes>
  );
}

export default AppRoutes;

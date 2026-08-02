import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { APP_CONFIG } from "./app/config/appConfig";
import "./index.css";

// Initialize theme preference from localStorage on startup
const storedDarkMode = localStorage.getItem("setting_darkMode") !== "false";
document.body.classList.toggle("light-theme", !storedDarkMode);
document.title = APP_CONFIG.appName;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider must be INSIDE BrowserRouter so it can use useNavigate */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("ngrok")) {
    return "/api";
  }
  return "https://taskflow-backend-4ken.onrender.com/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// ── Request Interceptor: attach token ──────────────────
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle errors globally ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};

    if (status === 401) {
      // Token expired or invalid → force logout
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/";
    } else if (status === 403) {
      // Forbidden action or deactivated account
      console.warn("Forbidden access:", data?.message || "You do not have permission for this action.");
      if (data?.message?.toLowerCase().includes("deactivated")) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.href = "/";
      }
    } else if (status === 500) {
      console.error("Internal Server Error (500):", data?.message || "A backend server error occurred.");
    }

    return Promise.reject(error);
  }
);

export default api;

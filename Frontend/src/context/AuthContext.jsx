import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginService, logout as logoutService, socialLogin as socialLoginService, googleOAuthLogin as googleOAuthLoginService, getCurrentUser as getCurrentUserService } from "../services/authService";

// ── Create the context ──────────────────────────────────
const AuthContext = createContext(null);

// ── Provider component ─────────────────────────────────
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  // Initialize user from sessionStorage (persists on refresh)
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => sessionStorage.getItem("token") || null);
  const [loading, setLoading] = useState(() => !!sessionStorage.getItem("token"));
  const [error, setError]   = useState(null);

  // ── Session Restoration Effect ────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = sessionStorage.getItem("token");
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await getCurrentUserService();
        setUser(freshUser);
        sessionStorage.setItem("user", JSON.stringify(freshUser));
      } catch (err) {
        console.error("Session restoration failed:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          logoutService();
          sessionStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Login ──────────────────────────────────────────────
  const login = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginService(formData); // calls authService.js
      setToken(res.token);
      setUser(res.user);

      // Persist to sessionStorage
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("user", JSON.stringify(res.user));
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
      throw err; // re-throw so Login.jsx can also handle it
    } finally {
      setLoading(false);
    }
  };

  // ── Social Login ────────────────────────────────────────
  const loginWithSocial = async (socialData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await socialLoginService(socialData);
      setToken(res.token);
      setUser(res.user);
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("user", JSON.stringify(res.user));
    } catch (err) {
      const msg = err.response?.data?.message || "Social login failed.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth Login ───────────────────────────────────
  const loginWithGoogleCode = async (code, redirectUri) => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleOAuthLoginService(code, redirectUri);
      setToken(res.token);
      setUser(res.user);
      sessionStorage.setItem("token", res.token);
      sessionStorage.setItem("user", JSON.stringify(res.user));
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || "Google login failed.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────
  const logout = () => {
    logoutService(); // removes token from sessionStorage
    sessionStorage.removeItem("user");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  // ── Helpers ────────────────────────────────────────────
  const isAuthenticated = !!token;
  const isAdmin         = user?.role === "admin";
  const isManager       = user?.role === "project_manager";
  const isMember        = user?.role === "team_member";

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        loginWithSocial,
        loginWithGoogleCode,
        logout,
        updateUser,
        isAuthenticated,
        isAdmin,
        isManager,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Custom hook for easy access ────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

export default AuthContext;

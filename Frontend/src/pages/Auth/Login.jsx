import "../../styles/login.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaEnvelope, FaEyeSlash, FaLock, FaEye, FaCheck } from "react-icons/fa";
import { MdChecklist } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import AuthGraphic from "../../components/AuthGraphic";
import { APP_CONFIG } from "../../app/config/appConfig";

function Login() {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      await login(formData);
      setLoginSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1800);
    } catch (err) {
      // Error state is handled by AuthContext.
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="login-page">
      {loginSuccess && (
        <div className="success-overlay">
          <div className="success-container">
            <div className="success-icon-wrapper">
              <div className="success-circle-glow"></div>
              <div className="success-circle-border"></div>
              <div className="success-inner-circle">
                <FaCheck />
              </div>
            </div>
            <h1 className="success-title">Login Successful!</h1>
            <p className="success-desc">
              Redirecting to your dashboard
              <span className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="login-container">
        <div className="login-left">
          <div className="brand-header">
            <div className="brand-logo-container">
              <MdChecklist />
            </div>
            <div className="brand-title-box">
              <h2 className="brand-name">
                {APP_CONFIG.appNamePrimary} <span>{APP_CONFIG.appNameAccent}</span>
              </h2>
              <span className="brand-subtitle">{APP_CONFIG.appTagline}</span>
            </div>
          </div>

          <h1 className="branding-headline">
            {APP_CONFIG.authHeadline.primary}
            <span>{APP_CONFIG.authHeadline.secondary}</span>
            <span className="gradient-achieve">{APP_CONFIG.authHeadline.accent}</span>
          </h1>

          <p className="branding-desc">
            {APP_CONFIG.authDescription} <span>{APP_CONFIG.appName}.</span>
          </p>

          <AuthGraphic mode="login" />
        </div>

        <div className="login-right">
          <div className="glass-card">
            <h2 className="form-title">Welcome Back!</h2>
            <p className="form-subtitle">{APP_CONFIG.loginSubtitle}</p>

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  color: "#ef4444",
                  fontSize: "13.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                Authentication failed: {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <FaEnvelope className="input-icon" />
                <input
                  type="email"
                  name="email"
                  className="input-field"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading || loginSuccess}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading || loginSuccess}
                />
                <span
                  className="input-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <div className="form-actions">
              <div
                className={`remember-me ${rememberMe ? "remember-checked" : ""}`}
                onClick={() => setRememberMe((current) => !current)}
              >
                <div className="custom-checkbox">
                  <FaCheck />
                </div>
                Remember me
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <a href="/reset-password" className="forgot-link">
                  Reset Password?
                </a>
              </div>
            </div>

            <button
              className="gradient-btn"
              onClick={handleLogin}
              disabled={loading || loginSuccess}
            >
              {loading ? "Signing In..." : "Login"}
            </button>

            <div className="form-footer">
              Users are created and managed by the administrator.
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        {APP_CONFIG.copyrightText}
      </footer>
    </div>
  );
}

export default Login;

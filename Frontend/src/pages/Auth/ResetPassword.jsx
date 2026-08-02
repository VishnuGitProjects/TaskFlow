import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { requestPasswordReset, resetPassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import AuthGraphic from "../../components/AuthGraphic";
import "../../styles/login.css";

import { FaLock, FaEyeSlash, FaEye, FaCheck, FaArrowLeft, FaEnvelope } from "react-icons/fa";
import { MdChecklist } from "react-icons/md";

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const resetToken = searchParams.get("token") || "";
  const isResetMode = Boolean(resetToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resetLink, setResetLink] = useState("");

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const { strength, strengthPercent } = useMemo(() => {
    if (!password) {
      return { strength: "Weak", strengthPercent: 15 };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length >= 8 && hasLower && hasUpper && hasDigit && hasSpecial) {
      return { strength: "Strong", strengthPercent: 100 };
    }

    if (password.length >= 6 && hasLower && hasDigit) {
      return { strength: "Medium", strengthPercent: 66 };
    }

    return { strength: "Weak", strengthPercent: 33 };
  }, [password]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setResetLink("");

    try {
      const response = await requestPasswordReset(trimmedEmail);
      setSuccess(true);
      setResetLink(response.resetUrl || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(resetToken, password, confirmPassword);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {success && isResetMode && (
        <div className="success-overlay">
          <div className="success-container">
            <div className="success-icon-wrapper">
              <div className="success-circle-glow"></div>
              <div className="success-circle-border"></div>
              <div className="success-inner-circle">
                <FaCheck />
              </div>
            </div>
            <h1 className="success-title">Password Reset!</h1>
            <p className="success-desc">
              Redirecting to login
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
              <h2 className="brand-name">TaskFlow <span>Pro</span></h2>
              <span className="brand-subtitle">Task Management & Progress Tracker</span>
            </div>
          </div>

          <h1 className="branding-headline">
            {isResetMode ? "Create a" : "Recover Your"}
            <span>{isResetMode ? " New Password." : " Account Access."}</span>
            <span className="gradient-achieve">{isResetMode ? "Stay Secure." : "Reset Safely."}</span>
          </h1>

          <p className="branding-desc">
            {isResetMode
              ? "Choose a strong password before this secure reset link expires."
              : "Enter your email and we will send a secure password reset link if your account exists."}
          </p>

          <AuthGraphic mode="reset" />
        </div>

        <div className="login-right">
          <div className="glass-card">
            <h2 className="form-title">{isResetMode ? "Set New Password" : "Forgot Password?"}</h2>
            <p className="form-subtitle">
              {isResetMode ? "Enter your new password below." : "Request a secure password reset link."}
            </p>

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
                }}
              >
                {error}
              </div>
            )}

            {!isResetMode && success && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.14)",
                  border: "1px solid rgba(16, 185, 129, 0.28)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  color: "#a7f3d0",
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                }}
              >
                If an account exists for that email, a reset link has been sent.
                {resetLink && (
                  <div style={{ marginTop: "8px" }}>
                    Development reset link: <a href={resetLink} style={{ color: "#fff" }}>{resetLink}</a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={isResetMode ? handleResetPassword : handleRequestReset}>
              {!isResetMode && (
                <div className="form-group" style={{ marginBottom: "18px" }}>
                  <label className="form-label">Email Address</label>
                  <div className="input-container">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      className="input-field"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}

              {isResetMode && (
                <>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div className="input-container">
                      <FaLock className="input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="input-field"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading || success}
                      />
                      <span className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>

                    {password && (
                      <div className="strength-meter">
                        <div className="strength-bar-container">
                          <div
                            className="strength-bar"
                            style={{
                              width: `${strengthPercent}%`,
                              backgroundColor:
                                strength === "Strong"
                                  ? "#10b981"
                                  : strength === "Medium"
                                    ? "#f59e0b"
                                    : "#f43f5e",
                            }}
                          ></div>
                        </div>
                        <div className="strength-label">
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Password Strength:</span>
                          <span className={`strength-${strength}`}>{strength}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="form-label">Confirm New Password</label>
                    <div className="input-container">
                      <FaLock className="input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="input-field"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading || success}
                      />
                      <span className="input-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>
                  </div>

                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "10px" }}>
                    {PASSWORD_POLICY_MESSAGE}
                  </p>
                </>
              )}

              <button
                type="submit"
                className="gradient-btn"
                disabled={loading || (isResetMode && success)}
                style={{ marginTop: "15px", marginBottom: "25px" }}
              >
                {loading
                  ? (isResetMode ? "Resetting password..." : "Sending reset link...")
                  : (isResetMode ? "Reset Password" : "Send Reset Link")}
              </button>

              <div className="form-footer">
                <span
                  onClick={() => navigate("/login")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaArrowLeft size={10} /> Back to Login
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      <footer className="auth-footer">© 2025 TaskFlow Pro. All rights reserved.</footer>
    </div>
  );
};

export default ResetPassword;

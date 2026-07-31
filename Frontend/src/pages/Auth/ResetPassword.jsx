import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import AuthGraphic from "../../components/AuthGraphic";
import "../../styles/login.css";

import { FaLock, FaEyeSlash, FaEye, FaCheck, FaArrowLeft, FaEnvelope } from "react-icons/fa";
import { MdChecklist } from "react-icons/md";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [strength, setStrength] = useState("Weak");
  const [strengthPercent, setStrengthPercent] = useState(33);

  // Simple Password Strength Evaluator
  useEffect(() => {
    if (!password) {
      setStrength("Weak");
      setStrengthPercent(15);
      return;
    }

    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const len = password.length;

    if (len >= 8 && hasLetters && hasDigits && hasSpecial) {
      setStrength("Strong");
      setStrengthPercent(100);
    } else if (len >= 6 && hasLetters && hasDigits) {
      setStrength("Medium");
      setStrengthPercent(66);
    } else {
      setStrength("Weak");
      setStrengthPercent(33);
    }
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email.trim().toLowerCase(), password, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 1800);
    } catch (err) {
      console.log("Reset Password Error:", err);
      setError(err.response?.data?.message || err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Success Redirect Overlay */}
      {success && (
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
        {/* Left Side - Branding */}
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
            Reset Your
            <span>Credentials.</span>
            <span className="gradient-achieve">Secure Access.</span>
          </h1>

          <p className="branding-desc">
            Choose a strong password containing letters, digits, and special characters to protect your account.
          </p>

          <AuthGraphic mode="reset" />
        </div>

        {/* Right Side - Reset Password Form Card */}
        <div className="login-right">
          <div className="glass-card">
            <h2 className="form-title">Reset Password 🔑</h2>
            <p className="form-subtitle">Enter your new password below.</p>

            <form onSubmit={handleSubmit}>
              {/* Error Message */}
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
                  ⚠️ {error}
                </div>
              )}

              {/* Email Field */}
              <div className="form-group" style={{ marginBottom: "15px" }}>
                <label className="form-label">Email Address</label>
                <div className="input-container">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    className="input-field"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
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
                  <span
                    className="input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>

                {/* Password Strength Meter */}
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

              {/* Confirm Password Field */}
              <div className="form-group" style={{ marginTop: "10px" }}>
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
                  <span
                    className="input-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="gradient-btn"
                disabled={loading || success}
                style={{ marginTop: "15px", marginBottom: "25px" }}
              >
                {loading ? "Resetting password..." : "Reset Password"}
              </button>

              {/* Back to Login link */}
              <div className="form-footer">
                <span
                  onClick={() => navigate("/")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaArrowLeft size={10} /> Back to Login
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <footer className="auth-footer">
        © 2025 TaskFlow Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default ResetPassword;

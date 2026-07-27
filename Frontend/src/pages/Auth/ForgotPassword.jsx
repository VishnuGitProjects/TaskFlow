import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import AuthGraphic from "../../components/AuthGraphic";
import "../../styles/login.css";

import { FaEnvelope, FaCheck, FaArrowLeft } from "react-icons/fa";
import { MdChecklist } from "react-icons/md";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      console.log("Forgot Password Error:", err);
      setError(err.response?.data?.message || "Failed to generate password reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
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
            Recover Your
            <span>Account.</span>
            <span className="gradient-achieve">Secure & Fast.</span>
          </h1>

          <p className="branding-desc">
            Organize tasks, manage projects, and stay in control of your credentials.
          </p>

          <AuthGraphic mode="forgot" />
        </div>

        {/* Right Side - Forgot Password Form Card */}
        <div className="login-right">
          <div className="glass-card">
            <h2 className="form-title">Forgot Password? 🔒</h2>
            <p className="form-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {/* Success Message */}
            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "2px solid #10b981",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#10b981",
                    fontSize: "24px",
                    margin: "0 auto 20px",
                  }}
                >
                  <FaCheck />
                </div>
                <h3 style={{ color: "#fff", marginBottom: "10px" }}>Reset Link Sent!</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "25px" }}>
                  A password reset link has been generated. Please check your server console logs for the link.
                </p>
                <button
                  className="gradient-btn"
                  onClick={() => navigate("/")}
                >
                  Back to Login
                </button>
              </div>
            ) : (
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
                <div className="form-group">
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
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="gradient-btn"
                  disabled={loading}
                  style={{ marginTop: "10px", marginBottom: "25px" }}
                >
                  {loading ? "Sending link..." : "Send Reset Link"}
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
            )}
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

export default ForgotPassword;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import AuthGraphic from "../../components/AuthGraphic";
import "../../styles/login.css";

import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaEyeSlash,
  FaEye,
  FaCheck,
  FaGoogle,
  FaMicrosoft,
  FaApple,
} from "react-icons/fa";
import { MdChecklist } from "react-icons/md";

function Signup() {
  const navigate = useNavigate();
  const { loginWithSocial, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [socialPrompt, setSocialPrompt] = useState(null);
  const [socialEmail, setSocialEmail] = useState("");
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSocialLogin = (provider) => {
    if (provider === "google") {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (clientId) {
        const redirectUri = window.location.origin;
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&state=google`;
        window.location.href = googleAuthUrl;
      } else {
        setShowGoogleChooser(true);
      }
    } else {
      setSocialPrompt(provider);
      setSocialEmail("yashika@test.com");
    }
  };

  const handleSocialSubmitDirect = async (email, name) => {
    try {
      setShowGoogleChooser(false);
      setLoading(true);
      await loginWithSocial({ email, name, provider: "google" });
      setSignupSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Social login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSubmit = async (e) => {
    e.preventDefault();
    if (!socialEmail.trim()) return;
    const provider = socialPrompt;
    const name = socialEmail.split("@")[0];
    try {
      setSocialPrompt(null);
      setLoading(true);
      await loginWithSocial({ email: socialEmail, name, provider });
      setSignupSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Social login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    // Check empty fields
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate password policy (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }

    // Confirm passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      setSignupSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.log("Signup Error:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || "Error creating user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Success Redirect Overlay */}
      {signupSuccess && (
        <div className="success-overlay">
          <div className="success-container">
            <div className="success-icon-wrapper">
              <div className="success-circle-glow"></div>
              <div className="success-circle-border"></div>
              <div className="success-inner-circle">
                <FaCheck />
              </div>
            </div>
            <h1 className="success-title">Account Created!</h1>
            <p className="success-desc" style={{ padding: "0 20px", color: "rgba(255,255,255,0.7)", fontSize: "14px", lineHeight: "1.5" }}>
              Your account has been created successfully. Redirecting you to the login page...
            </p>
            <button 
              className="gradient-btn" 
              onClick={() => navigate("/")} 
              style={{ marginTop: "24px", width: "auto", padding: "12px 30px", alignSelf: "center" }}
            >
              Go to Login
            </button>
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
            Plan. Track.
            <span>Collaborate.</span>
            <span className="gradient-achieve">Achieve More.</span>
          </h1>

          <p className="branding-desc">
            Streamline your projects, manage tasks, and boost team productivity with <span>TaskFlow Pro.</span>
          </p>

          <AuthGraphic mode="signup" />
        </div>

        {/* Right Side - Signup Form Card */}
        <div className="login-right">
          <div className="glass-card">
            <h2 className="form-title">Create Account 👋</h2>
            <p className="form-subtitle">Join TaskFlow Pro and start organizing work.</p>

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
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Name Field */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-container">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading || signupSuccess}
                />
              </div>
            </div>

            {/* Email Field */}
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
                  disabled={loading || signupSuccess}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="input-field"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading || signupSuccess}
                />
                <span
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
 
            {/* Confirm Password Field */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-container">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="input-field"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading || signupSuccess}
                />
              </div>
            </div>

            {/* Signup Button */}
            <button
              className="gradient-btn"
              onClick={handleSubmit}
              disabled={loading || signupSuccess}
              style={{ marginTop: "10px" }}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>

            {/* Divider */}
            <div className="divider">or continue with</div>

            {/* Social Logins */}
            <button 
              className="google-btn" 
              onClick={() => handleSocialLogin("google")} 
              type="button"
              aria-label="Sign up with Google"
            >
              <div className="google-logo-wrapper">
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </div>
              <span>Sign up with Google</span>
            </button>

            {/* Form Footer */}
            <div className="form-footer">
              Already have an account?{" "}
              <span onClick={() => navigate("/")}>Login</span>
            </div>
          </div>
        </div>
      </div>

      {showGoogleChooser && (
        <div className="success-overlay" style={{ background: "#0a0a0a", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div style={{ background: "#131314", border: "1px solid #303030", borderRadius: "28px", width: "90%", maxWidth: "850px", overflow: "hidden", display: "flex", color: "#e3e3e3", fontFamily: "'Google Sans', Roboto, Arial, sans-serif", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", textAlign: "left" }}>
            
            {/* Left Column (Brand info) */}
            <div style={{ width: "45%", padding: "40px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid #303030" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span style={{ fontSize: "16px", fontWeight: "500", color: "#e3e3e3" }}>Sign up with Google</span>
                </div>

                <div style={{ marginTop: "40px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                    <MdChecklist style={{ fontSize: "28px", color: "#fff" }} />
                  </div>
                  <h1 style={{ fontSize: "36px", fontWeight: "400", color: "#fff", lineHeight: "1.2", marginBottom: "12px" }}>Choose an account</h1>
                  <p style={{ fontSize: "16px", color: "#c4c7c5" }}>to continue to <strong style={{ color: "#3b82f6" }}>TaskFlow Pro</strong></p>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#8e918f", lineHeight: "1.5" }}>
                Before using this app, you can review TaskFlow Pro's <a href="#" style={{ color: "#a8c7fa", textDecoration: "none" }}>Privacy Policy</a> and <a href="#" style={{ color: "#a8c7fa", textDecoration: "none" }}>Terms of Service</a>.
              </div>
            </div>

            {/* Right Column (Account Selector) */}
            <div style={{ width: "55%", padding: "40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "14px", color: "#c4c7c5" }}>Select one of your accounts</span>
                  <button onClick={() => setShowGoogleChooser(false)} style={{ background: "none", border: "none", color: "#8e918f", cursor: "pointer", fontSize: "18px" }}>✕</button>
                </div>

                {/* Account 1 */}
                <div 
                  onClick={() => handleSocialSubmitDirect("yashika6.mishra@gmail.com", "Yashika Mishra")}
                  style={{ display: "flex", alignItems: "center", padding: "16px", borderRadius: "12px", border: "1px solid #303030", cursor: "pointer", transition: "background 0.2s", background: "#1f1f20" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#2a2a2b"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#1f1f20"}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "16px", marginRight: "16px" }}>
                    Y
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#fff" }}>Yashika Mishra</div>
                    <div style={{ fontSize: "13px", color: "#8e918f" }}>yashika6.mishra@gmail.com</div>
                  </div>
                </div>

                {/* Account 2 */}
                <div 
                  onClick={() => handleSocialSubmitDirect("bindubrd01@gmail.com", "Yashika mishra")}
                  style={{ display: "flex", alignItems: "center", padding: "16px", borderRadius: "12px", border: "1px solid #303030", cursor: "pointer", transition: "background 0.2s", background: "#1f1f20" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#2a2a2b"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#1f1f20"}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "16px", marginRight: "16px" }}>
                    Y
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#fff" }}>Yashika mishra</div>
                    <div style={{ fontSize: "13px", color: "#8e918f" }}>bindubrd01@gmail.com</div>
                  </div>
                </div>

                {/* Use another account */}
                <div 
                  onClick={() => {
                    const customEmail = prompt("Enter your Google Email Address:");
                    if (customEmail) {
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(customEmail)) {
                        alert("Please enter a valid real-life email address format.");
                        return;
                      }
                      handleSocialSubmitDirect(customEmail, customEmail.split("@")[0]);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", padding: "16px", borderRadius: "12px", border: "1px solid #303030", cursor: "pointer", transition: "background 0.2s", background: "#1f1f20" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#2a2a2b"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#1f1f20"}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#374151", color: "#e3e3e3", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "16px" }}>
                    👤
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "500", color: "#fff" }}>Use another account</div>
                  </div>
                </div>

              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "40px", fontSize: "12px", color: "#8e918f" }}>
                <span>English (United Kingdom)</span>
                <div style={{ display: "flex", gap: "16px" }}>
                  <a href="#" style={{ color: "#8e918f", textDecoration: "none" }}>Help</a>
                  <a href="#" style={{ color: "#8e918f", textDecoration: "none" }}>Privacy</a>
                  <a href="#" style={{ color: "#8e918f", textDecoration: "none" }}>Terms</a>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {socialPrompt && (
        <div className="success-overlay" style={{ background: "rgba(0, 0, 0, 0.75)" }}>
          <div className="success-container" style={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.08)", padding: "30px", borderRadius: "16px", maxWidth: "400px", width: "90%", display: "flex", flexDirection: "column", gap: "15px", alignItems: "stretch", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#fff" }}>Sign up with {socialPrompt === "google" ? "Google" : socialPrompt === "microsoft" ? "Windows" : "Apple"}</h2>
              <button onClick={() => setSocialPrompt(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "-5px" }}>
              To simulate social account sign-up, enter your account email below.
            </p>
            <form onSubmit={handleSocialSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", color: "#94a3b8" }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder={`name@${socialPrompt === "google" ? "gmail.com" : socialPrompt === "microsoft" ? "outlook.com" : "icloud.com"}`}
                  value={socialEmail}
                  onChange={(e) => setSocialEmail(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: "8px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "14px" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "5px" }}>
                <button type="button" onClick={() => setSocialPrompt(null)} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: "13.5px" }}>Cancel</button>
                <button type="submit" style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13.5px" }}>Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Copyright */}
      <footer className="auth-footer">
        © 2025 TaskFlow Pro. All rights reserved.
      </footer>
    </div>
  );
}

export default Signup;
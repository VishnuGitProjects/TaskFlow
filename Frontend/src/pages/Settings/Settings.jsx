import { useEffect, useState } from "react";
import { FaCheck, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";
import { changePassword, updateProfile } from "../../services/authService";
import "../../styles/settings.css";

const cardStyle = {
  background: "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.94) 100%)",
  border: "1px solid rgba(148,163,184,0.14)",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.35)",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.16)",
  background: "rgba(15,23,42,0.78)",
  color: "#fff",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "rgba(226,232,240,0.78)",
  fontSize: "13px",
};

const buttonStyle = {
  border: "none",
  borderRadius: "14px",
  padding: "12px 18px",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: "700",
  cursor: "pointer",
};

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateProfile(profileForm);
      updateUser(response.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setError("");
    setSuccess("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Please fill in all password fields.");
      setSavingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <MainLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "30px", color: "#fff", margin: 0 }}>Settings</h1>
        <p style={{ margin: 0, color: "rgba(226,232,240,0.62)" }}>
          Administrator profile and password management.
        </p>
      </div>

      {(error || success) && (
        <div
          style={{
            ...cardStyle,
            padding: "14px 18px",
            marginBottom: "18px",
            borderColor: error ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.28)",
            color: error ? "#fca5a5" : "#86efac",
          }}
        >
          {error || success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "22px" }}>
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div className="settings-icon-badge">
              <FaUser />
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "22px" }}>User Profile</h2>
              <p style={{ margin: "4px 0 0 0", color: "rgba(226,232,240,0.6)" }}>
                Update the administrator display information.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((current) => ({ ...current, name: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((current) => ({ ...current, email: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <div style={{ color: "rgba(226,232,240,0.5)", fontSize: "13px" }}>
                Role: <strong style={{ color: "#fff" }}>{user?.role || "admin"}</strong>
              </div>
              <button type="submit" style={buttonStyle} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div className="settings-icon-badge">
              <FaLock />
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "22px" }}>Password</h2>
              <p style={{ margin: "4px 0 0 0", color: "rgba(226,232,240,0.6)" }}>
                Change the administrator password securely.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {[
              ["currentPassword", "Current Password", "current"],
              ["newPassword", "New Password", "next"],
              ["confirmPassword", "Confirm Password", "confirm"],
            ].map(([field, label, toggleKey]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswords[toggleKey] ? "text" : "password"}
                    value={passwordForm[field]}
                    onChange={(e) =>
                      setPasswordForm((current) => ({ ...current, [field]: e.target.value }))
                    }
                    style={{ ...inputStyle, paddingRight: "50px" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((current) => ({
                        ...current,
                        [toggleKey]: !current[toggleKey],
                      }))
                    }
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "rgba(226,232,240,0.6)",
                      cursor: "pointer",
                    }}
                  >
                    {showPasswords[toggleKey] ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={buttonStyle} disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div style={{ ...cardStyle, marginTop: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
        <FaCheck style={{ color: "#22c55e" }} />
        <p style={{ margin: 0, color: "rgba(226,232,240,0.68)" }}>
          This page has been limited to the exact administrator settings required by the project: user profile and password.
        </p>
      </div>
    </MainLayout>
  );
};

export default Settings;

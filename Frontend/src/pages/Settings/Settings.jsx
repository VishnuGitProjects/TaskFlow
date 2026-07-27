import React, { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../context/AuthContext";
import { getProjects } from "../../services/projectService";
import { getTeams } from "../../services/teamService";
import { changePassword, updateProfile, deleteAccount } from "../../services/authService";
import {
  FaSlidersH,
  FaUser,
  FaLock,
  FaBell,
  FaUsers,
  FaCreditCard,
  FaCogs,
  FaPalette,
  FaGlobe,
  FaCloudDownloadAlt,
  FaChevronRight,
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../../styles/settings.css";

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState("general");

  // Tab 1: General Settings (Persisted in localStorage)
  const [generalSettings, setGeneralSettings] = useState(() => {
    return {
      siteName: localStorage.getItem("setting_siteName") || "TaskFlow Pro",
      timeZone: localStorage.getItem("setting_timeZone") || "(GMT+05:30) Asia/Kolkata",
      dateFormat: localStorage.getItem("setting_dateFormat") || "MM DD, YYYY",
      weekStartDay: localStorage.getItem("setting_weekStartDay") || "Monday",
    };
  });

  // Tab 2: Profile Settings
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || "",
  });

  // Tab 3: Security Settings
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Tab 8: Appearance Settings (Persisted in localStorage)
  const [appPreferences, setAppPreferences] = useState(() => {
    return {
      defaultView: localStorage.getItem("setting_defaultView") || "Overview",
      tasksPerPage: localStorage.getItem("setting_tasksPerPage") || "10",
      darkMode: localStorage.getItem("setting_darkMode") !== "false",
      compactMode: localStorage.getItem("setting_compactMode") === "true",
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const [projRes, teamRes] = await Promise.all([getProjects(), getTeams()]);
        setProjects(projRes || []);
        setTeams(teamRes || []);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Update profileForm if user changes in context
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  // Handle General Settings Save
  const handleSaveGeneral = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      localStorage.setItem("setting_siteName", generalSettings.siteName);
      localStorage.setItem("setting_timeZone", generalSettings.timeZone);
      localStorage.setItem("setting_dateFormat", generalSettings.dateFormat);
      localStorage.setItem("setting_weekStartDay", generalSettings.weekStartDay);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save general settings.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Profile Settings Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateProfile(profileForm);
      updateUser(res.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Submit
  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = securityForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Incorrect current password or update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "WARNING: Are you sure you want to permanently delete your account?\nAll projects you own, tasks, teams, and associated data will be permanently wiped. This action CANNOT be undone."
    );
    if (!confirmDelete) return;

    try {
      setSaving(true);
      setError(null);
      await deleteAccount();
      alert("Your account has been permanently deleted.");
      logout();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to delete account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Preferences Switch toggles
  const handlePreferenceToggle = (key, val) => {
    const updated = { ...appPreferences, [key]: val };
    setAppPreferences(updated);
    localStorage.setItem(`setting_${key}`, val);
    
    // Trigger global body dark mode toggle if changing dark mode
    if (key === "darkMode") {
      document.body.classList.toggle("light-theme", !val);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  // Calculate member stats
  const memberSinceDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Jan 15, 2025";

  const userTeamsCount = teams.filter((team) => {
    const memberIds = (team.members || []).map((m) => m._id || m);
    if (team.manager) memberIds.push(team.manager._id || team.manager);
    return memberIds.includes(user?.id || user?._id);
  }).length;

  return (
    <MainLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", paddingBottom: "10px" }}>
        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "28px", fontWeight: "700", color: "#fff" }}>
          Settings
        </h1>
        <p style={{ fontSize: "13.5px", color: "rgba(255, 255, 255, 0.45)", marginBottom: "15px" }}>
          Manage your account and system preferences
        </p>
      </div>

      <div className="settings-layout">
        {/* Left Side: Tabs Panel */}
        <div className="settings-sidebar">
          <button className={`settings-tab-btn ${activeTab === "general" ? "active" : ""}`} onClick={() => { setActiveTab("general"); setError(null); setSuccess(false); }}>
            <div className="settings-tab-left">
              <FaSlidersH />
              <div className="settings-tab-info">
                <span className="settings-tab-title">General</span>
                <span className="settings-tab-desc">Basic settings and preferences</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "general" ? 0.8 : 0.2 }} />
          </button>

          <button className={`settings-tab-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => { setActiveTab("profile"); setError(null); setSuccess(false); }}>
            <div className="settings-tab-left">
              <FaUser />
              <div className="settings-tab-info">
                <span className="settings-tab-title">Profile</span>
                <span className="settings-tab-desc">Update your personal information</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "profile" ? 0.8 : 0.2 }} />
          </button>

          <button className={`settings-tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => { setActiveTab("security"); setError(null); setSuccess(false); }}>
            <div className="settings-tab-left">
              <FaLock />
              <div className="settings-tab-info">
                <span className="settings-tab-title">Security</span>
                <span className="settings-tab-desc">Password and security settings</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "security" ? 0.8 : 0.2 }} />
          </button>

          <button className={`settings-tab-btn ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")}>
            <div className="settings-tab-left">
              <FaBell />
              <div className="settings-tab-info">
                <span className="settings-tab-title">Notifications</span>
                <span className="settings-tab-desc">Manage your notifications</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "notifications" ? 0.8 : 0.2 }} />
          </button>

          <button className={`settings-tab-btn ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>
            <div className="settings-tab-left">
              <FaUsers />
              <div className="settings-tab-info">
                <span className="settings-tab-title">Team</span>
                <span className="settings-tab-desc">Team and member settings</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "team" ? 0.8 : 0.2 }} />
          </button>

          <button className={`settings-tab-btn ${activeTab === "language" ? "active" : ""}`} onClick={() => setActiveTab("language")}>
            <div className="settings-tab-left">
              <FaGlobe />
              <div className="settings-tab-info">
                <span className="settings-tab-title">Language & Region</span>
                <span className="settings-tab-desc">Language and regional settings</span>
              </div>
            </div>
            <FaChevronRight style={{ fontSize: "10px", opacity: activeTab === "language" ? 0.8 : 0.2 }} />
          </button>
        </div>

        {/* Center Panel: Content Cards */}
        <div className="settings-main">
          {success && (
            <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#10b981", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCheck /> Changes saved successfully!
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.25)", color: "#ef4444", padding: "12px 16px", borderRadius: "12px", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Tab 1: General Settings */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="settings-card">
              <div className="settings-card-header">
                <h2>General Settings</h2>
                <p>Manage your account preferences and application settings.</p>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group full-width">
                  <label className="settings-label">Site Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  />
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>This name will be displayed across the application.</span>
                </div>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label className="settings-label">Default Time Zone</label>
                  <select
                    className="settings-select"
                    value={generalSettings.timeZone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timeZone: e.target.value })}
                  >
                    <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                    <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time</option>
                    <option value="(GMT+00:00) London">(GMT+00:00) UTC / London</option>
                    <option value="(GMT+09:00) Tokyo">(GMT+09:00) Asia / Tokyo</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Date Format</label>
                  <select
                    className="settings-select"
                    value={generalSettings.dateFormat}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                  >
                    <option value="MM DD, YYYY">May 23, 2025 (MM DD, YYYY)</option>
                    <option value="DD/MM/YYYY">23/05/2025 (DD/MM/YYYY)</option>
                    <option value="YYYY-MM-DD">2025-05-23 (YYYY-MM-DD)</option>
                  </select>
                </div>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label className="settings-label">Week Start Day</label>
                  <select
                    className="settings-select"
                    value={generalSettings.weekStartDay}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, weekStartDay: e.target.value })}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-settings-save" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}

          {/* Tab 2: Profile Settings */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="settings-card">
              <div className="settings-card-header">
                <h2>Profile Settings</h2>
                <p>Update your personal info, email ID, and avatar details.</p>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label className="settings-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="settings-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="settings-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group full-width">
                  <label className="settings-label">Avatar URL (Optional)</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Enter image link"
                    value={profileForm.avatar}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn-settings-save" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}

          {/* Tab 3: Security Settings (Change Password) */}
          {activeTab === "security" && (
            <form onSubmit={handleSaveSecurity} className="settings-card">
              <div className="settings-card-header">
                <h2>Security Settings</h2>
                <p>Update your password regularly for better security.</p>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group full-width">
                  <label className="settings-label">Current Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      className="settings-input"
                      style={{ width: "100%", paddingRight: "40px" }}
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    />
                    <span onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: "absolute", right: "12px", top: "12px", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>
              </div>

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label className="settings-label">New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="settings-input"
                      style={{ width: "100%", paddingRight: "40px" }}
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    />
                    <span onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", right: "12px", top: "12px", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Confirm New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="settings-input"
                      style={{ width: "100%", paddingRight: "40px" }}
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    />
                    <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "12px", top: "12px", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-settings-save" disabled={saving}>
                {saving ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* Tab placeholders for other buttons */}
          {!["general", "profile", "security"].includes(activeTab) && (
            <div className="settings-card" style={{ padding: "40px 20px", textAlign: "center" }}>
              <FaCogs style={{ fontSize: "40px", color: "rgba(255,255,255,0.15)", marginBottom: "15px" }} />
              <h3>{activeTab.toUpperCase()} Settings</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "6px" }}>This section is currently managed at the system configuration level.</p>
            </div>
          )}

          {/* Data Management Card (Always visible at the bottom of main settings content) */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>Data Management</h2>
              <p>Manage your application data and local storage.</p>
            </div>

            <div className="action-row">
              <div className="toggle-info">
                <span className="toggle-title">Clear Cache</span>
                <span className="toggle-desc">Wipe out temporary data files to free memory.</span>
              </div>
              <button className="btn-settings-action action-blue" onClick={() => alert("Cache cleared successfully.")}>Clear Cache</button>
            </div>

            <div className="action-row">
              <div className="toggle-info">
                <span className="toggle-title">Delete Account</span>
                <span className="toggle-desc">Permanently wipe your account and all associated projects.</span>
              </div>
              <button className="btn-settings-action action-red" onClick={handleDeleteAccount} disabled={saving}>Delete Account</button>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Summary & Storage widgets */}
        <div className="settings-info-panel">
          {/* Profile Summary Card */}
          <div className="profile-summary-card">
            <div className="settings-avatar-wrapper">
              <div className="settings-avatar-circle" style={{ background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)` }}>
                {initials}
              </div>
              <div className="settings-avatar-edit-overlay" onClick={() => setActiveTab("profile")}>
                <FaCamera />
              </div>
            </div>

            <h3>{user?.name || "User Name"}</h3>
            <p className="role-subtitle">{user?.role === "admin" ? "Project Admin" : user?.role === "project_manager" ? "Project Manager" : "Team Member"}</p>
            <p className="email-subtitle">{user?.email}</p>

            <div className="profile-stats-divider"></div>

            <div className="profile-stat-item">
              <span className="profile-stat-lbl">Member Since</span>
              <span className="profile-stat-val">{memberSinceDate}</span>
            </div>

            <div className="profile-stat-item">
              <span className="profile-stat-lbl">Role</span>
              <span className="profile-stat-val">{user?.role === "admin" ? "Admin" : user?.role === "project_manager" ? "Manager" : "Member"}</span>
            </div>

            <div className="profile-stat-item">
              <span className="profile-stat-lbl">Teams</span>
              <span className="profile-stat-val">{loadingStats ? "..." : `${userTeamsCount} Teams`}</span>
            </div>

            <div className="profile-stat-item">
              <span className="profile-stat-lbl">Projects</span>
              <span className="profile-stat-val">{loadingStats ? "..." : `${projects.length} Projects`}</span>
            </div>
          </div>

          {/* Storage Usage Card */}
          <div className="storage-card">
            <h3>Storage Usage</h3>
            <div className="storage-progress-info">
              <span>Used 2.45 GB of 10 GB</span>
              <span>24%</span>
            </div>
            <div className="storage-progress-bar-bg">
              <div className="storage-progress-bar-fill" style={{ width: "24%" }}></div>
            </div>
            <button className="btn-manage-storage" onClick={() => alert("Redirecting to storage dashboard...")}>Manage Storage</button>
          </div>

          {/* Danger Zone Card */}
          <div className="danger-zone-card">
            <h3>Danger Zone</h3>
            <p>This action cannot be undone. Please proceed with caution.</p>
            <button className="btn-reset-settings" onClick={() => alert("Settings reset request sent.")}>Reset All Settings</button>
          </div>
        </div>
      </div>

      {/* Settings Footer */}
      <div className="settings-footer">
        <span>© 2025 TaskFlow Pro. All rights reserved.</span>
        <div className="settings-footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Help Center</span>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
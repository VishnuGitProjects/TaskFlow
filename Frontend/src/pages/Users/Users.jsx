import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  FaPlus,
  FaFilter,
  FaPen,
  FaTrash,
  FaUserShield,
  FaUsers,
  FaCheckCircle,
  FaEnvelope,
  FaTimes,
  FaSearch,
  FaEye,
  FaUser,
} from "react-icons/fa";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/userService";
import { getTeams } from "../../services/teamService";
import "../../styles/users.css";
import "../../components/Projects/CreateProjectModal.css"; // Reuse modal classes

const Users = () => {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Forms
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "team_member",
    password: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "team_member",
    isActive: true,
  });

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const [usersData, teamsData] = await Promise.all([getUsers(), getTeams()]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (err) {
      console.error("Failed to load users or teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  const getUserTeamName = (user) => {
    const realTeam = teams.find((t) => {
      const isMember = t.members && t.members.some((m) => {
        const id = typeof m === "object" ? m._id : m;
        return id === user._id;
      });
      const isManager = t.manager && (typeof t.manager === "object" ? t.manager._id : t.manager) === user._id;
      return isMember || isManager;
    });

    if (realTeam) return realTeam.name;
    return "No Team";
  };

  const getLastActive = (user) => {
    const date = user.updatedAt ? new Date(user.updatedAt) : new Date();
    const diffMs = new Date() - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins <= 0) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const getAvatarGradient = (user) => {
    const colors = [
      "linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    ];
    const nameCode = user.name ? user.name.charCodeAt(0) : 65;
    return colors[nameCode % colors.length];
  };

  const handleOpenInvite = () => {
    setInviteForm({
      name: "",
      email: "",
      role: "team_member",
      password: "",
    });
    setShowInviteModal(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      alert("Email is required.");
      return;
    }
    try {
      await createUser(inviteForm);
      alert(`User ${inviteForm.name || inviteForm.email} added successfully!`);
      setShowInviteModal(false);
      loadUsersData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add user");
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "team_member",
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editingUser._id, editForm);
      alert("User updated successfully!");
      setEditingUser(null);
      loadUsersData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update user");
    }
  };

  const handleDeleteUserClick = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user account?")) return;
    try {
      await deleteUser(userId);
      alert("User account deleted.");
      loadUsersData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const updatedStatus = !user.isActive;
      await updateUser(user._id, { isActive: updatedStatus });
      loadUsersData();
    } catch (error) {
      alert("Failed to toggle status");
    }
  };

  // Filtered Users list
  const filteredUsers = users.filter((u) => {
    const text = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(text)) ||
      (u.email && u.email.toLowerCase().includes(text)) ||
      (u.role && u.role.toLowerCase().includes(text))
    );
  });

  // Derived counts
  const totalCount = users.length;
  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const adminCount = users.filter(u => u.role === "admin").length;

  // Global search listener
  useEffect(() => {
    const handleGlobalSearch = (e) => {
      setSearchTerm(e.detail || "");
    };
    window.addEventListener("globalSearch", handleGlobalSearch);
    return () => window.removeEventListener("globalSearch", handleGlobalSearch);
  }, []);

  return (
    <MainLayout>
      <div className="users-wrapper">
        {/* Top Header and Actions */}
        <div className="users-top-bar">
          <div className="users-welcome">
            <h1>User Management</h1>
            <div className="breadcrumbs">
              Dashboard <span>&gt;</span> User Management
            </div>
          </div>
          <div className="users-actions">
            <button className="btn-add-new-user" onClick={handleOpenInvite}>
              <FaPlus /> Add New User
            </button>
            <button className="btn-filters">
              <FaFilter /> Filters
            </button>
          </div>
        </div>

        {/* Stats Summary Cards Row */}
        <div className="users-stats-grid">
          <div className="users-stat-card stat-purple">
            <div className="users-card-content">
              <span className="card-label">Total Users</span>
              <h2 className="card-value">{totalCount}</h2>
              <span className="card-trend trend-neutral">—</span>
            </div>
            <div className="users-card-icon-container">
              <FaUsers />
            </div>
          </div>

          <div className="users-stat-card stat-green">
            <div className="users-card-content">
              <span className="card-label">Active Users</span>
              <h2 className="card-value">{activeCount}</h2>
              <span className="card-trend trend-neutral">—</span>
            </div>
            <div className="users-card-icon-container">
              <FaCheckCircle />
            </div>
          </div>

          <div className="users-stat-card stat-orange">
            <div className="users-card-content">
              <span className="card-label">Inactive Users</span>
              <h2 className="card-value">{inactiveCount}</h2>
              <span className="card-trend trend-neutral">—</span>
            </div>
            <div className="users-card-icon-container">
              <FaUser />
            </div>
          </div>

          <div className="users-stat-card stat-blue">
            <div className="users-card-content">
              <span className="card-label">Administrators</span>
              <h2 className="card-value">{adminCount}</h2>
              <span className="card-trend trend-neutral">—</span>
            </div>
            <div className="users-card-icon-container">
              <FaUserShield />
            </div>
          </div>

          <div className="users-stat-card stat-pink">
            <div className="users-card-content">
              <span className="card-label">Pending Invitations</span>
              <h2 className="card-value">0</h2>
              <span className="card-trend trend-neutral">—</span>
            </div>
            <div className="users-card-icon-container">
              <FaEnvelope />
            </div>
          </div>
        </div>

        {/* Members Directory list table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Loading directory...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="users-table-container" style={{ textAlign: "center", padding: "40px" }}>
            <h3 style={{ color: "rgba(255,255,255,0.4)" }}>No Users Found</h3>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const initials = user.name
                    ? user.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "U";

                  return (
                    <tr key={user._id}>
                      <td>
                        <div className="user-meta-cell">
                          <div className="user-avatar-circle" style={{ background: getAvatarGradient(user) }}>
                            {initials}
                          </div>
                          <div className="user-meta-info">
                            <h4>{user.name}</h4>
                            <p>{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`role-badge role-${
                          user.role === "admin" ? "admin" : user.role === "project_manager" ? "manager" : "member"
                        }`}>
                          {user.role === "project_manager" ? "Project Manager" : user.role === "admin" ? "Administrator" : "Team Member"}
                        </span>
                      </td>

                      <td>
                        <div className="team-cell">
                          <FaUsers className="team-icon" />
                          <span>{getUserTeamName(user)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="status-cell" onClick={() => handleToggleStatus(user)} style={{ cursor: "pointer" }} title="Click to toggle status">
                          <span className={`status-dot ${user.isActive ? "active" : "inactive"}`}></span>
                          <span className="status-text">{user.isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="last-active-text">{getLastActive(user)}</span>
                      </td>

                      <td>
                        <div className="users-actions-cell">
                          <button className="user-act-btn btn-view-user" onClick={() => alert(`Viewing User details:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.isActive ? 'Active' : 'Inactive'}`)} title="View User">
                            <FaEye />
                          </button>
                          <button className="user-act-btn btn-edit-user" onClick={() => handleOpenEdit(user)} title="Edit Role & Status">
                            <FaPen />
                          </button>
                          <button className="user-act-btn btn-delete-user" onClick={() => handleDeleteUserClick(user._id)} title="Delete Account">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "420px", marginTop: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "20px" }}>Add New User</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
              <div className="modal-col">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter name (e.g. Yashika)"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="modal-col">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email ID"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="modal-col">
                <label>Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                >
                  <option value="team_member">Team Member</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div className="modal-col">
                <label>Password (optional)</label>
                <input
                  type="password"
                  placeholder="Defaults to 123456"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="modal-buttons" style={{ marginTop: "10px" }}>
                <button type="button" className="cancel-btn" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="create-btn" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "420px", marginTop: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "20px" }}>Edit Workspace User</h2>
              <button onClick={() => setEditingUser(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
              <div className="modal-col">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="modal-col">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email ID"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="modal-col">
                <label>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  style={{ padding: "10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                >
                  <option value="team_member">Team Member</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div className="modal-col" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                <input
                  type="checkbox"
                  id="isActiveCheckbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="isActiveCheckbox" style={{ color: "#e2e8f0", fontSize: "13.5px", cursor: "pointer" }}>Account Active / Enabled</label>
              </div>

              <div className="modal-buttons" style={{ marginTop: "10px" }}>
                <button type="button" className="cancel-btn" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Users;

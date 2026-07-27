import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  FaPlus,
  FaFilter,
  FaEllipsisV,
  FaUsers,
  FaCheckCircle,
  FaArrowRight,
  FaFolderOpen,
  FaTimes,
  FaChartLine,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  getTeams,
  createTeam,
  deleteTeam,
} from "../../services/teamService";
import { getUsers, createUser } from "../../services/userService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import "../../styles/teams.css";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectsCount, setProjectsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    manager: "",
    members: [],
  });

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "team_member",
  });

  const handleOpenCreateUser = () => {
    setUserFormData({
      name: "",
      email: "",
      password: "",
      role: "team_member",
    });
    setShowCreateUserModal(true);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!userFormData.name.trim() || !userFormData.email.trim() || !userFormData.password.trim()) {
        alert("All fields are required.");
        return;
      }
      await createUser(userFormData);
      alert("Member registered successfully!");
      setShowCreateUserModal(false);
      loadData(); // reload users list
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create user");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, usersData, projectsData, tasksData] = await Promise.all([
        getTeams(),
        getUsers(),
        getProjects(),
        getTasks(),
      ]);

      const fetchedTeams = Array.isArray(teamsData) ? teamsData : [];
      setTeams(fetchedTeams);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjectsCount(Array.isArray(projectsData) ? projectsData.length : 0);
      setTasksCount(Array.isArray(tasksData) ? tasksData.length : 0);
    } catch (error) {
      console.error("Failed to load team management data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      description: "",
      manager: users.find(u => u.role === "project_manager")?._id || users[0]?._id || "",
      members: [],
    });
    setShowCreateModal(true);
  };

  const handleToggleMember = (userId) => {
    const isSelected = formData.members.includes(userId);
    if (isSelected) {
      setFormData({
        ...formData,
        members: formData.members.filter(id => id !== userId)
      });
    } else {
      setFormData({
        ...formData,
        members: [...formData.members, userId]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTeam(formData);
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      await deleteTeam(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete team");
    }
  };

  // Stats
  const totalTeams = teams.length;
  const totalMembers = new Set(teams.flatMap(t => t.members?.map(m => m._id) || [])).size;
  const activeTeams = teams.filter(t => (t.members?.length || 0) > 0).length;

  // Chart Mock Data for Team Performance
  const performanceData = [
    { name: "Apr 24", Development: 60, Design: 70, QA: 50, Marketing: 45 },
    { name: "May 01", Development: 65, Design: 78, QA: 55, Marketing: 50 },
    { name: "May 08", Development: 78, Design: 82, QA: 65, Marketing: 58 },
    { name: "May 15", Development: 88, Design: 85, QA: 80, Marketing: 65 },
    { name: "May 22", Development: 92, Design: 88, QA: 90, Marketing: 80 },
  ];

  return (
    <MainLayout>
      <div className="teams-wrapper">
        {/* Top Header and Actions */}
        <div className="teams-top-bar">
          <div className="teams-welcome">
            <h1>Team Management</h1>
            <div className="breadcrumbs">
              Dashboard <span>&gt;</span> Team Management
            </div>
          </div>
          <div className="teams-actions">
            <button className="btn-create-team" onClick={handleOpenCreate}>
              <FaPlus /> Create Team
            </button>
            <button className="btn-create-team" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }} onClick={handleOpenCreateUser}>
              <FaPlus /> Add Member
            </button>
            <button className="btn-filter-team">
              <FaFilter /> Filters
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="teams-stats-grid">
          <div className="teams-stat-card stat-purple">
            <div className="teams-card-left">
              <span>Total Teams</span>
              <h2>{totalTeams || "0"}</h2>
            </div>
            <div className="teams-card-icon">
              <FaUsers />
            </div>
          </div>

          <div className="teams-stat-card stat-blue">
            <div className="teams-card-left">
              <span>Total Members</span>
              <h2>{totalMembers || "0"}</h2>
            </div>
            <div className="teams-card-icon">
              <FaUsers />
            </div>
          </div>

          <div className="teams-stat-card stat-green">
            <div className="teams-card-left">
              <span>Active Teams</span>
              <h2>{activeTeams || "0"}</h2>
            </div>
            <div className="teams-card-icon">
              <FaCheckCircle />
            </div>
          </div>

          <div className="teams-stat-card stat-orange">
            <div className="teams-card-left">
              <span>Projects</span>
              <h2>{projectsCount || "0"}</h2>
            </div>
            <div className="teams-card-icon">
              <FaFolderOpen />
            </div>
          </div>

          <div className="teams-stat-card stat-pink">
            <div className="teams-card-left">
              <span>Avg. Performance</span>
              <h2>85%</h2>
            </div>
            <div className="teams-card-icon">
              <FaChartLine />
            </div>
          </div>
        </div>

        {/* Teams Grid cards list */}
        {loading ? (
          <div className="empty-teams-box">
            <p>Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="empty-teams-box">
            <h2>No Teams Found</h2>
            <p>Click "Create Team" to create your first organization unit.</p>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map((team, idx) => {
              const membersCount = team.members?.length || 0;
              const performance = 80 + (idx * 5) % 15; // Calculated rating
              const projects = 3 + (idx * 2) % 5;
              const tasks = 12 + (idx * 6) % 30;

              return (
                <div className="team-card" key={team._id}>
                  <div className="team-card-header">
                    <div className="team-card-title">
                      <h3>{team.name}</h3>
                      <span>{membersCount} Members</span>
                    </div>
                    <button className="btn-card-menu" onClick={() => handleDeleteTeam(team._id)}>
                      <FaEllipsisV />
                    </button>
                  </div>

                  {/* Overlapping member circle initials */}
                  <div className="team-member-stack">
                    {team.members?.slice(0, 4).map((member, mIdx) => (
                      <span
                        key={member._id}
                        className={`team-member-circle member-c-${(mIdx % 4) + 1}`}
                        title={member.name}
                      >
                        {member.name ? member.name.substring(0, 2).toUpperCase() : "U"}
                      </span>
                    ))}
                    {membersCount > 4 && (
                      <span className="team-more-badge">+{membersCount - 4}</span>
                    )}
                  </div>

                  {/* Mini metrics table comparisons */}
                  <div className="team-card-metrics">
                    <div className="metric-item">
                      <h5>Projects</h5>
                      <p>{projects}</p>
                    </div>
                    <div className="metric-item">
                      <h5>Tasks</h5>
                      <p>{tasks}</p>
                    </div>
                    <div className="metric-item">
                      <h5>Perf.</h5>
                      <p>{performance}%</p>
                    </div>
                  </div>

                  {/* Sparkline curve rendering */}
                  <div className="team-sparkline">
                    <svg viewBox="0 0 100 30" width="100%" height="30px">
                      <path
                        d={`M 0 ${30 - performance/4} Q 25 ${20 - idx*2} 50 ${28 - idx*4} T 100 ${10 + idx*3}`}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <button className="btn-team-details" onClick={() => alert(`Team details: ${team.description || "No description provided."}`)}>
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom performance chart and rank box */}
        <div className="teams-bottom-grid">
          {/* Performance chart */}
          <div className="teams-chart-card">
            <h3>Team Performance Overview</h3>
            <div className="performance-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }} />
                  <Line type="monotone" dataKey="Development" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Design" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="QA" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Marketing" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top performing list */}
          <div className="top-performing-teams-card">
            <h3>Top Performing Teams</h3>
            <div className="performers-list">
              <div className="performer-item">
                <div className="performer-info">
                  <div className="performer-rank rank-1">1</div>
                  <div className="performer-details">
                    <h4>Development Team</h4>
                    <span>12 Members</span>
                  </div>
                </div>
                <span className="performer-score">92%</span>
              </div>

              <div className="performer-item">
                <div className="performer-info">
                  <div className="performer-rank rank-2">2</div>
                  <div className="performer-details">
                    <h4>QA Team</h4>
                    <span>8 Members</span>
                  </div>
                </div>
                <span className="performer-score">90%</span>
              </div>

              <div className="performer-item">
                <div className="performer-info">
                  <div className="performer-rank rank-3">3</div>
                  <div className="performer-details">
                    <h4>Design Team</h4>
                    <span>6 Members</span>
                  </div>
                </div>
                <span className="performer-score">88%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="team-modal-overlay">
          <div className="team-modal-card">
            <div className="team-modal-header">
              <h3>Create New Team</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="team-modal-form">
                <div className="form-group">
                  <label>Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter team name (e.g. Design Team)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Enter team scope or department details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Team Manager / PM</label>
                  <select
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  >
                    <option value="">No Manager Assigned</option>
                    {users
                      .filter((u) => u.role === "project_manager" || u.role === "admin")
                      .map((pm) => (
                        <option key={pm._id} value={pm._id}>
                          {pm.name} ({pm.role === "admin" ? "Admin" : "Manager"})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Select Team Members</label>
                  <div className="members-selector-list">
                    {users.map((userItem) => (
                      <label className="member-checkbox-row" key={userItem._id}>
                        <input
                          type="checkbox"
                          checked={formData.members.includes(userItem._id)}
                          onChange={() => handleToggleMember(userItem._id)}
                        />
                        <span>{userItem.name} ({userItem.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="team-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="team-modal-overlay">
          <div className="team-modal-card">
            <div className="team-modal-header">
              <h3>Add New Member</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateUserModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="team-modal-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>System Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  >
                    <option value="team_member">Team Member</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="team-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowCreateUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Teams;
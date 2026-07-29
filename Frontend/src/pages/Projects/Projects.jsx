import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import CreateProjectModal from "../../components/Projects/CreateProjectModal";
import EditProjectModal from "../../components/Projects/EditProjectModal";
import AddProjectMemberModal from "../../components/Projects/AddProjectMemberModal";
import ManageProjectMembersModal from "../../components/Projects/ManageProjectMembersModal";
import {
  FaPlus,
  FaFilter,
  FaEllipsisV,
  FaEye,
  FaPen,
  FaTrash,
  FaFolder,
  FaSyncAlt,
  FaCheck,
  FaPause,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaUserPlus,
  FaUsers,
  FaSignOutAlt,
} from "react-icons/fa";

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addMemberToProject,
  joinProject,
  regenerateInviteCode,
  leaveProject,
} from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";

import { useAuth } from "../../context/AuthContext";
import "../../styles/projects.css";

const Projects = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();

  const [projects, setProjects]         = useState([]);
  const [tasks, setTasks]               = useState([]);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreateModal, setShowCreate] = useState(false);
  const [editingProject, setEditProject] = useState(null);
  const [memberAssigningProject, setMemberAssigningProject] = useState(null);
  const [managingMembersProject, setManagingMembersProject] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const handleLeaveProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to leave this project?")) return;
    try {
      await leaveProject(projectId);
      alert("You have left the project successfully.");
      loadProjects();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to leave project");
    }
  };

  const handleAddMemberToProject = async (projectId, memberData) => {
    try {
      const updatedProject = await addMemberToProject(projectId, memberData);
      setProjects(projects.map((p) => (p._id === projectId ? updatedProject : p)));
      alert("Member added to project successfully!");
      loadProjects(); // reload to sync users lists
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add member to project.");
    }
  };

  const handleJoinProject = async () => {
    if (!inviteCode.trim()) {
      alert("Invite code is required.");
      return;
    }
    try {
      await joinProject(inviteCode.trim());
      alert("Successfully joined the project!");
      setShowJoinModal(false);
      setInviteCode("");
      loadProjects();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to join project. Check the code.");
    }
  };

  /* ── Load projects ─────────────────────────────── */
  const loadProjects = async () => {
    try {
      setLoading(true);
      
      let projectsData = [];
      try {
        projectsData = await getProjects();
      } catch (err) {
        console.error("Failed to load projects:", err);
      }

      let tasksData = [];
      try {
        tasksData = await getTasks();
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }

      let usersData = [];
      try {
        usersData = await getUsers();
      } catch (err) {
        console.error("Failed to load users:", err);
      }

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      setProjects([]);
      setTasks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  /* ── Create ──────────────────────────────────────── */
  const handleCreateProject = async (formData) => {
    try {
      await createProject(formData);
      setShowCreate(false);
      loadProjects();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to create project");
    }
  };

  /* ── Edit ────────────────────────────────────────── */
  const handleEditProject = async (id, formData) => {
    try {
      await updateProject(id, formData);
      setEditProject(null);
      loadProjects();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to update project");
    }
  };

  /* ── Delete ──────────────────────────────────────── */
  const handleDeleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      loadProjects();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to delete project");
    }
  };

  // Status counters matching reference counts or dynamically loaded ones
  const countByStatus = (statusName) => {
    return projects.filter(p => p.status?.toLowerCase().replace("_", " ") === statusName.toLowerCase()).length;
  };

  const totalCount = projects.length;
  const inProgressCount = countByStatus("In Progress") || countByStatus("in_progress") || 0;
  const completedCount = countByStatus("Completed") || countByStatus("completed") || 0;
  const onHoldCount = countByStatus("On Hold") || countByStatus("on_hold") || 0;
  const cancelledCount = countByStatus("Cancelled") || countByStatus("cancelled") || 0;

  return (
    <MainLayout>
      <div className="projects-page-wrapper">
        {/* Title, Breadcrumb & Actions Header */}
        <div className="projects-header-section">
          <div className="breadcrumb-section">
            <h1>Project Management</h1>
            <p className="breadcrumb-links">
              <span>Dashboard</span> &gt; <span>Project Management</span> &gt; <span className="active-breadcrumb">Projects</span>
            </p>
          </div>
          <div className="projects-actions">
            <button className="create-project-btn" style={{ marginRight: "10px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.25)" }} onClick={() => setShowJoinModal(true)}>
              <FaPlus /> Join Project
            </button>
            <button className="create-project-btn" onClick={() => setShowCreate(true)}>
              <FaPlus /> Create Project
            </button>
            <button className="filters-btn">
              <FaFilter /> Filters
            </button>
            <button className="ellipsis-btn">
              <FaEllipsisV />
            </button>
          </div>
        </div>

        {/* Stats Grid (Row of 5 status cards) */}
        <div className="projects-stats-grid">
          <div className="proj-stat-card stat-purple">
            <div className="stat-card-left">
              <span>Total Projects</span>
              <h2>{totalCount}</h2>
            </div>
            <div className="stat-card-icon">
              <FaFolder />
            </div>
          </div>

          <div className="proj-stat-card stat-blue">
            <div className="stat-card-left">
              <span>In Progress</span>
              <h2>{inProgressCount}</h2>
            </div>
            <div className="stat-card-icon">
              <FaSyncAlt />
            </div>
          </div>

          <div className="proj-stat-card stat-orange">
            <div className="stat-card-left">
              <span>Completed</span>
              <h2>{completedCount}</h2>
            </div>
            <div className="stat-card-icon">
              <FaCheck />
            </div>
          </div>

          <div className="proj-stat-card stat-pink">
            <div className="stat-card-left">
              <span>On Hold</span>
              <h2>{onHoldCount}</h2>
            </div>
            <div className="stat-card-icon">
              <FaPause />
            </div>
          </div>

          <div className="proj-stat-card stat-green">
            <div className="stat-card-left">
              <span>Cancelled</span>
              <h2>{cancelledCount}</h2>
            </div>
            <div className="stat-card-icon">
              <FaTimes />
            </div>
          </div>
        </div>

        {/* Projects Table List */}
        {loading ? (
          <div className="empty-projects-box">
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-projects-box">
            <h2>No Projects Found</h2>
            <p>
              {isAdmin || isManager
                ? "Click \"Create Project\" to add your first project."
                : "No projects have been assigned to you yet."}
            </p>
          </div>
        ) : (
          <div className="projects-table-container">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Project Manager</th>
                  <th>Team</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  // Generate color matching the name hash
                  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
                  const nameChar = project.name ? project.name.charCodeAt(0) : 65;
                  const color = colors[nameChar % colors.length];

                  // Initials
                  const initials = project.name
                    ? project.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "PR";

                  // Format dates
                  const formatDate = (dateStr) => {
                    if (!dateStr) return "N/A";
                    const date = new Date(dateStr);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    });
                  };

                  // Priority pill classes
                  const priority = project.priority || "Medium";
                  const statusText = project.status || "In Progress";
                  const progressVal = project.progress !== undefined ? project.progress : 0;

                  const projectTasks = tasks.filter(t => t.project?._id === project._id || t.project === project._id);
                  const uniqueMembers = [];
                  const seenIds = new Set();
                  projectTasks.forEach(task => {
                    if (task.assignedTo && task.assignedTo._id && !seenIds.has(task.assignedTo._id)) {
                      seenIds.add(task.assignedTo._id);
                      uniqueMembers.push(task.assignedTo);
                    }
                  });

                  return (
                    <tr key={project._id} onClick={() => navigate(`/projects/${project._id}`)} style={{ cursor: "pointer" }}>
                      {/* Project Badge + Title & Description */}
                      <td>
                        <div className="table-project-meta">
                          <div
                            className="project-avatar-badge"
                            style={{ background: `${color}15`, color: color }}
                          >
                            {initials}
                          </div>
                          <div className="project-info-text">
                            <h4 style={{ color: "#fff", textDecoration: "none" }} className="project-name-link">{project.name}</h4>
                            <p>{project.description || "No description provided."}</p>
                            {project.inviteCode && (
                              <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                                <span style={{ fontSize: "11.5px", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px", color: "#a5b4fc", fontFamily: "monospace" }}>
                                  Code: {project.inviteCode}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(project.inviteCode);
                                    alert("Invite code copied!");
                                  }}
                                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "10.5px", padding: 0 }}
                                  title="Copy Invite Code"
                                >
                                  Copy
                                </button>
                                {String(project.owner?._id || project.owner) === String(user?.id || user?._id) && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (window.confirm("Are you sure you want to regenerate the invite code?")) {
                                        try {
                                          await regenerateInviteCode(project._id);
                                          alert("Invite code regenerated!");
                                          loadProjects();
                                        } catch (error) {
                                          alert(error.response?.data?.message || "Failed to regenerate invite code");
                                        }
                                      }
                                    }}
                                    style={{ background: "transparent", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: "10.5px", padding: 0 }}
                                    title="Regenerate Invite Code"
                                  >
                                    Regenerate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Project Manager Column */}
                      <td>
                        <div className="table-manager-cell">
                          <div className="manager-avatar">
                            {project.owner?.name
                              ? project.owner.name.substring(0, 2).toUpperCase()
                              : "UA"}
                          </div>
                          <div className="manager-info">
                            <h4>{project.owner?.name || "Unassigned"}</h4>
                            <span>Project Manager</span>
                          </div>
                        </div>
                      </td>

                      {/* Team Avatar Stack */}
                      <td>
                        {project.members && project.members.length === 0 ? (
                           <span style={{ color: "rgba(255,255,255,0.3)", paddingLeft: "10px" }}>—</span>
                        ) : (
                          <div className="table-team-avatars">
                            <div className="team-avatar-stack">
                              {project.members && project.members.slice(0, 3).map((member, mIdx) => {
                                const u = member.user || {};
                                const displayName = u.name || "Member";
                                return (
                                  <span key={member._id || u._id} className={`team-circle circle-${(mIdx % 3) + 1}`} title={displayName}>
                                    {u.name ? u.name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "U"}
                                  </span>
                                );
                              })}
                            </div>
                            {project.members && project.members.length > 3 && (
                              <span className="team-more-badge">+{project.members.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td>{formatDate(project.startDate)}</td>
                      <td>{formatDate(project.endDate)}</td>

                      {/* Priority */}
                      <td>
                        <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                          {priority}
                        </span>
                      </td>

                      {/* Status dot */}
                      <td>
                        <div className="status-cell">
                          <span
                            className={`status-dot status-${statusText
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          ></span>
                          <span>{statusText}</span>
                        </div>
                      </td>

                      {/* Progress bar */}
                      <td>
                        <div className="progress-cell">
                          <span className="progress-value-text">{progressVal}%</span>
                          <div className="table-progress-bar-bg">
                            <div
                              className="table-progress-bar-fill"
                              style={{ width: `${progressVal}%`, background: color }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                          {/* All users can view project tasks */}
                          <button
                            className="act-btn btn-view"
                            onClick={(e) => { e.stopPropagation(); navigate(`/tasks?projectId=${project._id}`); }}
                            title="View Project Tasks"
                          >
                            <FaEye />
                          </button>

                          {String(project.owner?._id || project.owner) === String(user?.id || user?._id) || user?.role === "admin" ? (
                            <>
                              <button
                                className="act-btn btn-edit"
                                onClick={(e) => { e.stopPropagation(); setEditProject(project); }}
                                title="Edit Project"
                              >
                                <FaPen />
                              </button>
                              <button
                                className="act-btn"
                                style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}
                                onClick={(e) => { e.stopPropagation(); setMemberAssigningProject(project); }}
                                title="Add Member by Email"
                              >
                                <FaUserPlus />
                              </button>
                              <button
                                className="act-btn"
                                style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}
                                onClick={(e) => { e.stopPropagation(); setManagingMembersProject(project); }}
                                title="Manage Members & Roles"
                              >
                                <FaUsers />
                              </button>
                              <button
                                className="act-btn btn-delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(project._id); }}
                                title="Delete Project"
                              >
                                <FaTrash />
                              </button>
                            </>
                          ) : (
                            <button
                              className="act-btn"
                              style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
                              onClick={(e) => { e.stopPropagation(); handleLeaveProject(project._id); }}
                              title="Leave Project"
                            >
                              <FaSignOutAlt />
                            </button>
                          )}
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

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateProject}
        users={users}
      />

      {/* Edit Modal */}
      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          project={editingProject}
          onClose={() => setEditProject(null)}
          onUpdate={handleEditProject}
          users={users}
        />
      )}

      {/* Add Member Modal */}
      {memberAssigningProject && (
        <AddProjectMemberModal
          isOpen={!!memberAssigningProject}
          project={memberAssigningProject}
          onClose={() => setMemberAssigningProject(null)}
          onAddMember={handleAddMemberToProject}
        />
      )}

      {/* Join Project Modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "400px" }}>
            <h2>Join Project</h2>
            <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px", lineHeight: "1.5" }}>
              Enter the unique 8-character invite code of the project you want to join.
            </p>
            <input
              type="text"
              placeholder="Enter Invite Code (e.g. B83F9D8E)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              style={{ textTransform: "uppercase" }}
            />
            <div className="modal-buttons" style={{ marginTop: "20px" }}>
              <button className="cancel-btn" onClick={() => { setShowJoinModal(false); setInviteCode(""); }}>
                Cancel
              </button>
              <button className="create-btn" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }} onClick={handleJoinProject}>
                Join Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {managingMembersProject && (
        <ManageProjectMembersModal
          isOpen={!!managingMembersProject}
          project={managingMembersProject}
          currentUser={user}
          onClose={() => setManagingMembersProject(null)}
          onRefresh={loadProjects}
        />
      )}
    </MainLayout>
  );
};

export default Projects;
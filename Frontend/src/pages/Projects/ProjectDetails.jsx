import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import EditProjectModal from "../../components/Projects/EditProjectModal";
import AddProjectMemberModal from "../../components/Projects/AddProjectMemberModal";
import ManageProjectMembersModal from "../../components/Projects/ManageProjectMembersModal";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaFolder,
  FaHourglassHalf,
  FaKey,
  FaPlus,
  FaRegCalendarAlt,
  FaTasks,
  FaTrashAlt,
  FaUser,
  FaUserCheck,
  FaUserPlus,
  FaUsers,
  FaPaperclip,
} from "react-icons/fa";

import {
  getProjectById,
  updateProject,
  deleteProject,
  addMemberToProject,
  regenerateInviteCode,
} from "../../services/projectService";
import { getUsers } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import {
  canDeleteProject,
  canInviteProjectMembers,
  canManageProject,
  getAssignedProjectManager,
  getVisibleProjectMembers,
} from "../../app/helpers/projectPermissions";
import "../../styles/projectDetails.css";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectById(id);
      setProjectData(data);
      
      // Load all users for the edit modal
      try {
        const usersList = await getUsers();
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to load users list", err);
      }
    } catch (err) {
      console.error("Failed to fetch project details:", err);
      setError(err.response?.data?.message || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#fff" }}>
          <p style={{ fontSize: "16px" }}>Loading project details...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !projectData) {
    return (
      <MainLayout>
        <div className="details-card" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
          <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>Error Loading Project</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>{error || "Project details could not be found."}</p>
          <button className="back-btn" onClick={() => navigate("/projects")}>
            <FaArrowLeft /> Back to Projects
          </button>
        </div>
      </MainLayout>
    );
  }

  const { project, role, stats, tasks, activityLogs, attachments } = projectData;
  const assignedProjectManager = getAssignedProjectManager(project);
  const visibleMembers = getVisibleProjectMembers(project);

  // Check project role privileges
  const isOwnerOrAdmin = canManageProject(project, user);
  const isProjManager = role === "project_manager";
  const isTeamMember = !isOwnerOrAdmin && !isProjManager;
  const canDeleteCurrentProject = canDeleteProject(project, user);
  const canInviteMembers = canInviteProjectMembers(project, user);

  // Format dates helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Calculations for remaining days and duration
  const calculateDurationAndRemaining = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return { duration: "N/A", remaining: "N/A" };
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const today = new Date();
    
    // Clear time portion to compare days purely
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const durationMs = end - start;
    const remainingMs = end - today;
    
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    
    return {
      duration: durationDays >= 0 ? `${durationDays} days` : "N/A",
      remaining: remainingDays > 0 ? `${remainingDays} days remaining` : remainingDays === 0 ? "Ends today" : "Overdue"
    };
  };

  const { duration, remaining } = calculateDurationAndRemaining(project.startDate, project.endDate);

  // Color generator
  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
  const nameChar = project.name ? project.name.charCodeAt(0) : 65;
  const projectColor = colors[nameChar % colors.length];

  const handleEdit = async (projectId, formData) => {
    try {
      await updateProject(projectId, formData);
      setShowEditModal(false);
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update project.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this project? This will delete all tasks and logs.")) {
      try {
        await deleteProject(project._id);
        alert("Project deleted successfully.");
        navigate("/projects");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete project.");
      }
    }
  };

  const handleAddMember = async (projectId, memberData) => {
    try {
      await addMemberToProject(projectId, memberData);
      setShowAddMemberModal(false);
      fetchProjectDetails();
      alert("Member invited successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add member.");
    }
  };

  const handleRegenerate = async () => {
    if (window.confirm("Are you sure you want to regenerate the invite code?")) {
      try {
        await regenerateInviteCode(project._id);
        fetchProjectDetails();
        alert("Invite code regenerated successfully!");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to regenerate code.");
      }
    }
  };

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    try {
      setUpdatingStatus(true);
      await updateProject(project._id, { status: nextStatus });
      fetchProjectDetails();
      alert(`Project status updated to ${nextStatus}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <MainLayout>
      <div className="project-details-wrapper">
        
        {/* Header Section */}
        <div className="project-details-header">
          <button className="back-btn" onClick={() => navigate("/projects")}>
            <FaArrowLeft /> Back to Projects
          </button>

          <div className="project-details-actions">
            
            {/* Owner/Admin actions */}
            {isOwnerOrAdmin && (
              <>
                <button className="action-btn-details btn-blue" onClick={() => setShowEditModal(true)}>
                  <FaEdit /> Edit Project
                </button>
                {canInviteMembers && (
                  <>
                    <button className="action-btn-details btn-green" onClick={() => setShowAddMemberModal(true)}>
                      <FaUserPlus /> Invite Member
                    </button>
                    <button className="action-btn-details btn-purple" onClick={() => setShowManageMembersModal(true)}>
                      <FaUsers /> Manage Team
                    </button>
                  </>
                )}
                {canDeleteCurrentProject && (
                  <button className="action-btn-details btn-red" onClick={handleDelete}>
                    <FaTrashAlt /> Delete Project
                  </button>
                )}
              </>
            )}

            {/* Manager actions */}
            {isProjManager && (
              <>
                <button className="action-btn-details btn-purple" onClick={() => setShowManageMembersModal(true)}>
                  <FaUsers /> Manage Team
                </button>
                <button className="action-btn-details btn-blue" onClick={() => navigate(`/tasks?projectId=${project._id}`)}>
                  <FaTasks /> Manage Tasks
                </button>
              </>
            )}

            {/* Team Member actions */}
            {isTeamMember && (
              <button className="action-btn-details btn-blue" onClick={() => navigate(`/tasks?projectId=${project._id}`)}>
                <FaTasks /> View My Tasks
              </button>
            )}
            
          </div>
        </div>

        {/* Details Grid */}
        <div className="project-details-grid">
          
          {/* Left Column: Info & Team & Files */}
          <div className="details-left-column">
            
            {/* Overview Card */}
            <div className="details-card">
              <div className="project-title-area">
                <h2>{project.name}</h2>
                <p className="project-desc-text">{project.description || "No description provided for this project."}</p>
              </div>

              <div className="project-meta-grid">
                <div className="meta-item">
                  <span className="meta-item-label">Status</span>
                  <span className="meta-item-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`status-dot status-${(project.status || "In Progress").toLowerCase().replace(" ", "-")}`}></span>
                    {project.status || "In Progress"}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Priority</span>
                  <span className="meta-item-value">
                    <span className={`priority-badge priority-${(project.priority || "Medium").toLowerCase()}`}>
                      {project.priority || "Medium"}
                    </span>
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Start Date</span>
                  <span className="meta-item-value">{formatDate(project.startDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">End Date</span>
                  <span className="meta-item-value">{formatDate(project.endDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Project Manager</span>
                  <span className="meta-item-value">{assignedProjectManager?.name || "Unassigned"}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Invite Code</span>
                  <span className="meta-item-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "4px", color: "#a5b4fc", fontFamily: "monospace" }}>
                      {project.inviteCode || "N/A"}
                    </span>
                    {project.inviteCode && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(project.inviteCode);
                          alert("Invite code copied!");
                        }}
                        style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer", fontSize: "11px", fontWeight: "600", padding: 0 }}
                      >
                        Copy
                      </button>
                    )}
                    {isOwnerOrAdmin && project.inviteCode && (
                      <button 
                        onClick={handleRegenerate}
                        style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: "11px", fontWeight: "600", padding: 0 }}
                      >
                        Regenerate
                      </button>
                    )}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Duration</span>
                  <span className="meta-item-value">{duration}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Time Remaining</span>
                  <span className="meta-item-value" style={{ color: remaining.includes("Overdue") ? "#ef4444" : "#10b981", fontWeight: "600" }}>
                    {remaining}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Created At</span>
                  <span className="meta-item-value">{formatDate(project.createdAt)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-item-label">Last Updated</span>
                  <span className="meta-item-value">{formatDate(project.updatedAt)}</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="details-progress-section">
                <div className="details-progress-header">
                  <span className="meta-item-label">Overall Completion</span>
                  <span style={{ fontWeight: "700", color: projectColor }}>{project.progress || 0}%</span>
                </div>
                <div className="details-progress-bar-bg">
                  <div className="details-progress-bar-fill" style={{ width: `${project.progress || 0}%`, background: projectColor }}></div>
                </div>
              </div>

              {/* Status Update inline dropdown for Project Managers */}
              {isProjManager && (
                <div className="status-update-row">
                  <span className="meta-item-label">Update Project Status:</span>
                  <select 
                    className="status-update-select" 
                    value={project.status || "In Progress"} 
                    onChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            {/* Team Members List Card */}
            <div className="details-card">
              <div className="details-card-header">
                <h2>Project Team ({stats.totalMembers})</h2>
                <p>Members currently assigned to this project.</p>
              </div>
              
              <div className="members-list-wrapper">
                {/* Project Owner/Manager is the first item */}
                <div className="member-list-item">
                  <div className="member-avatar-cell">
                    <div className="member-avatar-circle-details" style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
                      {project.owner?.name ? project.owner.name.substring(0, 2).toUpperCase() : "UA"}
                    </div>
                    <div className="member-info-details">
                      <h4>{assignedProjectManager?.name || project.owner?.name || "Unassigned"}</h4>
                      <span>{assignedProjectManager?.email || project.owner?.email}</span>
                    </div>
                  </div>
                  <span className="member-role-badge role-owner">Project Manager</span>
                </div>

                {/* Other members */}
                {visibleMembers.map((member) => {
                  const u = member.user || {};
                  const initials = u.name ? u.name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "U";
                  return (
                    <div key={member._id || u._id} className="member-list-item">
                      <div className="member-avatar-cell">
                        <div className="member-avatar-circle-details" style={{ background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)` }}>
                          {initials}
                        </div>
                        <div className="member-info-details">
                          <h4>{u.name || "Member"}</h4>
                          <span>{u.email}</span>
                        </div>
                      </div>
                      <span className={`member-role-badge role-${member.role}`}>
                        {member.role ? member.role.replace("_", " ") : "member"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Files / Attachments Card */}
            <div className="details-card">
              <div className="details-card-header">
                <h2>Project Files & Attachments ({attachments.length})</h2>
                <p>Files uploaded in tasks belonging to this project.</p>
              </div>

              <div className="attachments-list-details">
                {attachments.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px", margin: 0 }}>No files or attachments have been uploaded yet.</p>
                ) : (
                  attachments.map((file, idx) => (
                    <div key={idx} className="attachment-item-details">
                      <div className="attachment-name-meta">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="attachment-link-btn">
                          <FaPaperclip style={{ marginRight: "6px" }} /> {file.filename || "Attachment"}
                        </a>
                        <span className="attachment-task-ref">Task: {file.taskTitle}</span>
                      </div>
                      <span className="attachment-task-ref">{formatDate(file.uploadedAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Statistics & Timeline */}
          <div className="details-right-column">
            
            {/* Stats Card */}
            <div className="details-card">
              <div className="details-card-header">
                <h2>Task Statistics</h2>
                <p>Overview of project tasks and progress.</p>
              </div>

              <div className="details-stats-list">
                <div className="details-stat-row">
                  <div className="stat-label-with-icon">
                    <FaTasks style={{ color: "#a78bfa" }} />
                    <span>Total Tasks</span>
                  </div>
                  <span className="details-stat-number">{stats.totalTasks}</span>
                </div>
                <div className="details-stat-row">
                  <div className="stat-label-with-icon">
                    <FaCheckCircle style={{ color: "#10b981" }} />
                    <span>Completed Tasks</span>
                  </div>
                  <span className="details-stat-number" style={{ color: "#10b981" }}>{stats.completedTasks}</span>
                </div>
                <div className="details-stat-row">
                  <div className="stat-label-with-icon">
                    <FaClock style={{ color: "#3b82f6" }} />
                    <span>In Progress Tasks</span>
                  </div>
                  <span className="details-stat-number" style={{ color: "#3b82f6" }}>{stats.inProgressTasks}</span>
                </div>
                <div className="details-stat-row">
                  <div className="stat-label-with-icon">
                    <FaHourglassHalf style={{ color: "#f59e0b" }} />
                    <span>Pending Tasks</span>
                  </div>
                  <span className="details-stat-number" style={{ color: "#f59e0b" }}>{stats.pendingTasks}</span>
                </div>
              </div>
            </div>

            {/* Timeline / Activity Logs */}
            <div className="details-card">
              <div className="details-card-header">
                <h2>Recent Activity</h2>
                <p>Timeline of modifications and updates.</p>
              </div>

              <div className="timeline-list">
                {activityLogs.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px", margin: "0 0 0 -20px" }}>No recent activity logged for this project.</p>
                ) : (
                  activityLogs.map((log) => (
                    <div key={log._id} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <span className="timeline-time">{formatDate(log.createdAt)}</span>
                      <span className="timeline-text">
                        <strong>{log.user?.name || "System"}</strong> {log.action}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Reusable Modals */}
      {showEditModal && (
        <EditProjectModal
          isOpen={showEditModal}
          project={project}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleEdit}
          users={users}
        />
      )}

      {showAddMemberModal && (
        <AddProjectMemberModal
          isOpen={showAddMemberModal}
          project={project}
          onClose={() => setShowAddMemberModal(false)}
          onAddMember={handleAddMember}
        />
      )}

      {showManageMembersModal && (
        <ManageProjectMembersModal
          isOpen={showManageMembersModal}
          project={project}
          currentUser={user}
          onClose={() => setShowManageMembersModal(false)}
          onRefresh={fetchProjectDetails}
        />
      )}

    </MainLayout>
  );
};

export default ProjectDetails;

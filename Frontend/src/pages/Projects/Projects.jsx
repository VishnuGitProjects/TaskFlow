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
  leaveProject,
} from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";
import { getTeams } from "../../services/teamService";

import { useAuth } from "../../context/AuthContext";
import {
  canDeleteProject,
  canInviteProjectMembers,
  getAssignedProjectManager,
  getVisibleProjectMembers,
} from "../../app/helpers/projectPermissions";
import "../../styles/projects.css";

const Projects = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreate] = useState(false);
  const [editingProject, setEditProject] = useState(null);
  const [memberAssigningProject, setMemberAssigningProject] = useState(null);
  const [managingMembersProject, setManagingMembersProject] = useState(null);

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
      await addMemberToProject(projectId, memberData);
      alert("Member added to project successfully!");
      loadProjects();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add member to project.");
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);

      const [projectsData, tasksData, usersData, teamsData] = await Promise.all([
        getProjects().catch((err) => {
          console.error("Failed to load projects:", err);
          return [];
        }),
        getTasks().catch((err) => {
          console.error("Failed to load tasks:", err);
          return [];
        }),
        getUsers().catch((err) => {
          console.error("Failed to load users:", err);
          return [];
        }),
        getTeams().catch((err) => {
          console.error("Failed to load teams:", err);
          return [];
        }),
      ]);

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      setProjects([]);
      setTasks([]);
      setUsers([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

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

  const countByStatus = (statusName) =>
    projects.filter((project) => project.status?.toLowerCase().replace("_", " ") === statusName.toLowerCase()).length;

  const totalCount = projects.length;
  const inProgressCount = countByStatus("In Progress");
  const completedCount = countByStatus("Completed");
  const onHoldCount = countByStatus("On Hold");
  const cancelledCount = countByStatus("Cancelled");

  return (
    <MainLayout>
      <div className="projects-page-wrapper">
        <div className="projects-header-section">
          <div className="breadcrumb-section">
            <h1>Project Management</h1>
            <p className="breadcrumb-links">
              <span>Dashboard</span> &gt; <span>Project Management</span> &gt; <span className="active-breadcrumb">Projects</span>
            </p>
          </div>
          <div className="projects-actions">
            {isAdmin && (
              <button className="create-project-btn" onClick={() => setShowCreate(true)}>
                <FaPlus /> Create Project
              </button>
            )}
            <button className="filters-btn">
              <FaFilter /> Filters
            </button>
            <button className="ellipsis-btn">
              <FaEllipsisV />
            </button>
          </div>
        </div>

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

        {loading ? (
          <div className="empty-projects-box">
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-projects-box">
            <h2>No Projects Found</h2>
            <p>{isAdmin ? 'Click "Create Project" to add your first project.' : "No projects have been assigned to you yet."}</p>
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
                  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
                  const nameChar = project.name ? project.name.charCodeAt(0) : 65;
                  const color = colors[nameChar % colors.length];
                  const initials = project.name
                    ? project.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "PR";

                  const formatDate = (dateStr) => {
                    if (!dateStr) return "N/A";
                    return new Date(dateStr).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    });
                  };

                  const priority = project.priority || "Medium";
                  const statusText = project.status || "In Progress";
                  const progressVal = project.progress !== undefined ? project.progress : 0;
                  const assignedManager = getAssignedProjectManager(project);
                  const visibleMembers = getVisibleProjectMembers(project);
                  const canManageMembers = canInviteProjectMembers(project, user);
                  const canDeleteCurrentProject = canDeleteProject(project, user);

                  return (
                    <tr key={project._id} onClick={() => navigate(`/projects/${project._id}`)} style={{ cursor: "pointer" }}>
                      <td>
                        <div className="table-project-meta">
                          <div className="project-avatar-badge" style={{ background: `${color}15`, color }}>
                            {initials}
                          </div>
                          <div className="project-info-text">
                            <h4 style={{ color: "#fff", textDecoration: "none" }} className="project-name-link">{project.name}</h4>
                            <p>{project.description || "No description provided."}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="table-manager-cell">
                          <div className="manager-avatar">
                            {assignedManager?.name ? assignedManager.name.substring(0, 2).toUpperCase() : "UA"}
                          </div>
                          <div className="manager-info">
                            <h4>{assignedManager?.name || "Unassigned"}</h4>
                            <span>Project Manager</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {!project.team ? (
                          <span style={{ color: "rgba(255,255,255,0.3)", paddingLeft: "10px" }}>No team assigned</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <strong style={{ color: "#fff", fontSize: "13px" }}>{project.team.name}</strong>
                            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
                              {visibleMembers.length + (assignedManager ? 1 : 0)} assigned
                            </span>
                          </div>
                        )}
                      </td>

                      <td>{formatDate(project.startDate)}</td>
                      <td>{formatDate(project.endDate)}</td>

                      <td>
                        <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                          {priority}
                        </span>
                      </td>

                      <td>
                        <div className="status-cell">
                          <span className={`status-dot status-${statusText.toLowerCase().replace(" ", "-")}`}></span>
                          <span>{statusText}</span>
                        </div>
                      </td>

                      <td>
                        <div className="progress-cell">
                          <span className="progress-value-text">{progressVal}%</span>
                          <div className="table-progress-bar-bg">
                            <div className="table-progress-bar-fill" style={{ width: `${progressVal}%`, background: color }}></div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="act-btn btn-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tasks?projectId=${project._id}`);
                            }}
                            title="View Project Tasks"
                          >
                            <FaEye />
                          </button>

                          {canManageMembers ? (
                            <>
                              <button
                                className="act-btn btn-edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditProject(project);
                                }}
                                title="Edit Project"
                              >
                                <FaPen />
                              </button>
                              <button
                                className="act-btn"
                                style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMemberAssigningProject(project);
                                }}
                                title="Add Member by Email"
                              >
                                <FaUserPlus />
                              </button>
                              <button
                                className="act-btn"
                                style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManagingMembersProject(project);
                                }}
                                title="Manage Members & Roles"
                              >
                                <FaUsers />
                              </button>
                              {canDeleteCurrentProject && (
                                <button
                                  className="act-btn btn-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project._id);
                                  }}
                                  title="Delete Project"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              className="act-btn"
                              style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveProject(project._id);
                              }}
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

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateProject}
        users={users}
        teams={teams}
      />

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          project={editingProject}
          onClose={() => setEditProject(null)}
          onUpdate={handleEditProject}
          users={users}
          teams={teams}
        />
      )}

      {memberAssigningProject && (
        <AddProjectMemberModal
          isOpen={!!memberAssigningProject}
          project={memberAssigningProject}
          onClose={() => setMemberAssigningProject(null)}
          onAddMember={handleAddMemberToProject}
        />
      )}

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

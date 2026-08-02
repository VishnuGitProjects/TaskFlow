import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import {
  FaPlus,
  FaFilter,
  FaEllipsisV,
  FaEye,
  FaPen,
  FaTrash,
  FaCalendarAlt,
  FaChevronDown,
  FaCheckCircle,
  FaArrowRight,
  FaClipboardList,
  FaFolderOpen,
  FaPause,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaDownload,
  FaPaperclip,
} from "react-icons/fa";

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../services/taskService";
import { getProjects } from "../../services/projectService";
import { getUsers } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import "../../styles/tasks.css";

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState("All Tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "To Do",
    priority: "Medium",
    dueDate: "",
    project: "",
    assignedTo: "",
    progress: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(window.location.search);
      const urlProjectId = queryParams.get("projectId") || "";

      const [tasksData, projectsData, usersData] = await Promise.all([
        getTasks(urlProjectId ? { projectId: urlProjectId } : {}),
        getProjects(),
        getUsers(),
      ]);
      
      const fetchedTasks = Array.isArray(tasksData) ? tasksData : [];
      const fetchedProjects = Array.isArray(projectsData) ? projectsData : [];
      
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setUsers(Array.isArray(usersData) ? usersData : []);

      // If projectId was in URL, set search filter to that project name
      if (urlProjectId && fetchedProjects.length > 0) {
        const matchingProj = fetchedProjects.find(p => p._id === urlProjectId);
        if (matchingProj) {
          setSearchQuery(matchingProj.name);
        }
      }

      // Default selected task is the first task
      if (fetchedTasks.length > 0 && !selectedTask) {
        setSelectedTask(fetchedTasks[0]);
      }
    } catch (error) {
      console.error("Failed to load task management data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Tasks
  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab === "My Tasks") {
        if (!task.assignedTo || task.assignedTo._id !== user?._id) return false;
      } else if (activeTab === "Assigned to Others") {
        if (task.assignedTo && task.assignedTo._id === user?._id) return false;
      } else if (activeTab === "Overdue Tasks") {
        const isOverdue = task.status !== "Completed" && task.dueDate && new Date(task.dueDate) < new Date();
        if (!isOverdue) return false;
      } else if (activeTab === "Completed Tasks") {
        if (task.status !== "Completed") return false;
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesProj = task.project?.name?.toLowerCase().includes(query);
        return matchesTitle || matchesDesc || matchesProj;
      }

      return true;
    });
  };

  const filteredTasksList = getFilteredTasks();

  // Stats Counters
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "To Do").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const reviewCount = tasks.filter((t) => t.status === "Review").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  // Actions
  const getProjectRoleForUser = (project) => {
    if (!project || !user) return null;
    if (user.role === "admin") return "owner";

    const ownerId = String(project.owner?._id || project.owner || "");
    if (ownerId === String(user._id)) {
      return "owner";
    }

    const membership = (project.members || []).find((member) => {
      const memberId = member.user?._id || member.user || member._id || member;
      return String(memberId) === String(user._id);
    });

    return membership?.role || null;
  };

  const canManageProjectTasks = (project) => {
    const role = getProjectRoleForUser(project);
    return ["owner", "admin", "project_manager"].includes(role);
  };

  const getProjectAssignees = (targetProjectId) => {
    const projId = targetProjectId || formData.project;
    if (!projId) return [];
    const proj = projects.find((p) => p._id === projId);
    if (!proj) return [];
    
    const list = [];
    if (proj.owner) {
      list.push(proj.owner);
    }
    if (proj.members) {
      proj.members.forEach((m) => {
        const u = m.user;
        if (u && u._id) {
          const alreadyInList = list.some((item) => String(item._id || item) === String(u._id));
          if (!alreadyInList) {
            list.push(u);
          }
        }
      });
    }
    return list;
  };

  const handleOpenCreate = () => {
    const firstProjId = projects[0]?._id || "";
    const assignees = getProjectAssignees(firstProjId);
    setFormData({
      title: "",
      description: "",
      status: "To Do",
      priority: "Medium",
      dueDate: "",
      project: firstProjId,
      assignedTo: assignees[0]?._id || "",
      progress: "",
    });
    setEditingTask(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "To Do",
      priority: task.priority || "Medium",
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
      project: task.project?._id || task.project || "",
      assignedTo: task.assignedTo?._id || task.assignedTo || "",
      progress: task.progress !== undefined ? task.progress : "",
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        progress: formData.progress === "" ? 0 : Number(formData.progress),
      };

      if (editingTask) {
        const updated = await updateTask(editingTask._id, payload);
        if (selectedTask?._id === editingTask._id) {
          setSelectedTask(updated);
        }
      } else {
        await createTask(payload);
      }
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save task");
    }
  };

  const isProjectOwnerForTask = (task) => {
    if (!task || !task.project) return false;
    const projectId = task.project._id || task.project;
    const project = projects.find(p => String(p._id) === String(projectId));
    return canManageProjectTasks(project);
  };

  const isOwnerOrAdmin = () => {
    if (!editingTask) {
      const currentProject = projects.find((project) => String(project._id) === String(formData.project));
      return canManageProjectTasks(currentProject);
    }

    const projectId = formData.project || editingTask.project?._id || editingTask.project;
    const project = projects.find(p => String(p._id) === String(projectId));
    return canManageProjectTasks(project);
  };

  const canCreateTask = () => {
    return projects.some((project) => canManageProjectTasks(project));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(id);
      if (selectedTask?._id === id) {
        setSelectedTask(null);
      }
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete task");
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getDueText = (task) => {
    if (!task.dueDate) return "No due date";
    const date = new Date(task.dueDate);
    const diffMs = date - new Date();
    const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (task.status === "Completed") return "Completed";
    if (daysDiff === 0) return "Due Today";
    if (daysDiff === 1) return "Due Tomorrow";
    if (daysDiff < 0) return `${Math.abs(daysDiff)} days overdue`;
    return `${daysDiff} days left`;
  };

  return (
    <MainLayout>
      <div className="tasks-wrapper">
        {/* Header Title and Actions */}
        <div className="tasks-top-bar">
          <div className="tasks-welcome">
            <h1>Task Management</h1>
            <div className="breadcrumbs">
              Dashboard <span>&gt;</span> Task Management <span>&gt;</span> Tasks
            </div>
          </div>
          <div className="tasks-actions">
            {canCreateTask() && (
              <button className="btn-create-task" onClick={handleOpenCreate}>
                <FaPlus /> Create Task
              </button>
            )}
            <button className="btn-filter-task">
              <FaFilter /> Filters
            </button>
            <button className="btn-more-dots">
              <FaEllipsisV />
            </button>
          </div>
        </div>

        {/* Task Stats Row */}
        <div className="tasks-stats-grid">
          <div className="tasks-stat-card stat-purple">
            <div className="tasks-card-left">
              <span>Total Tasks</span>
              <h2>{totalCount}</h2>
            </div>
            <div className="tasks-card-icon">
              <FaClipboardList />
            </div>
          </div>

          <div className="tasks-stat-card stat-blue">
            <div className="tasks-card-left">
              <span>To Do</span>
              <h2>{todoCount}</h2>
            </div>
            <div className="tasks-card-icon">
              <FaCalendarAlt />
            </div>
          </div>

          <div className="tasks-stat-card stat-orange">
            <div className="tasks-card-left">
              <span>In Progress</span>
              <h2>{inProgressCount}</h2>
            </div>
            <div className="tasks-card-icon">
              <FaPlus />
            </div>
          </div>

          <div className="tasks-stat-card stat-pink">
            <div className="tasks-card-left">
              <span>Review</span>
              <h2>{reviewCount}</h2>
            </div>
            <div className="tasks-card-icon">
              <FaPause />
            </div>
          </div>

          <div className="tasks-stat-card stat-green">
            <div className="tasks-card-left">
              <span>Completed</span>
              <h2>{completedCount}</h2>
            </div>
            <div className="tasks-card-icon">
              <FaCheckCircle />
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="tasks-filters-bar">
          <div className="tasks-tabs">
            {["All Tasks", "My Tasks", "Assigned to Others", "Overdue Tasks", "Completed Tasks"].map((tab) => (
              <button
                key={tab}
                className={`task-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="tasks-right-controls">
            <select
              className="view-selector-dropdown"
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            >
              <option value="">Table View</option>
              {projects.map(p => (
                <option key={p._id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks Table List */}
        {loading ? (
          <div className="empty-tasks-box">
            <p>Loading tasks...</p>
          </div>
        ) : filteredTasksList.length === 0 ? (
          <div className="empty-tasks-box">
            <h2>No Tasks Found</h2>
            <p>Create a task to get started.</p>
          </div>
        ) : (
          <div className="tasks-table-container">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th className="tasks-checkbox-cell"><input type="checkbox" /></th>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasksList.map((task) => {
                  const priority = task.priority || "Medium";
                  const status = task.status || "To Do";
                  const progress = task.progress !== undefined ? task.progress : 50;

                  return (
                    <tr key={task._id} style={{ cursor: "pointer" }} onClick={() => setSelectedTask(task)}>
                      <td className="tasks-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" />
                      </td>
                      <td>
                        <div className="table-task-meta">
                          <h4>{task.title}</h4>
                          <p>{task.description || "No description provided."}</p>
                        </div>
                      </td>
                      <td>{task.project?.name || "General"}</td>
                      <td>
                        {task.assignedTo ? (
                          <div className="table-assignee-cell">
                            <div className="assignee-avatar">
                              {task.assignedTo.name?.substring(0, 2).toUpperCase() || "U"}
                            </div>
                            <span className="assignee-name">{task.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.3)" }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`priority-badge priority-${priority.toLowerCase()}`}>
                          {priority}
                        </span>
                      </td>
                      <td>
                        <div className="due-date-cell">
                          <span className="date-text">{formatDate(task.dueDate)}</span>
                          <span className={`relative-text ${getDueText(task).includes("overdue") ? "overdue-text" : ""}`}>
                            {getDueText(task)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${status.toLowerCase().replace(" ", "")}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <div className="progress-table-cell">
                          <span>{progress}%</span>
                          <div className="progress-bar-wrapper">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions-cell">
                          <button className="table-action-btn" onClick={() => handleOpenEdit(task)}>
                            <FaPen />
                          </button>
                          {isProjectOwnerForTask(task) && (
                            <button className="table-action-btn btn-delete" onClick={() => handleDelete(task._id)}>
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="tasks-table-footer">
              <span>Showing 1 to {filteredTasksList.length} of {filteredTasksList.length} tasks</span>
              <div className="pagination-controls">
                <button className="btn-page-nav"><FaChevronLeft /></button>
                <button className="page-number active">1</button>
                <button className="btn-page-nav"><FaChevronRight /></button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Task Details Pane */}
        {selectedTask && (
          <div className="task-detail-pane">
            <div className="detail-header-row">
              <div className="detail-title-block">
                <h2>{selectedTask.title}</h2>
                <span className="project-pill">{selectedTask.project?.name || "General Project"}</span>
              </div>
              <div className="detail-metrics-row">
                <div className="metric-item">
                  <span>Priority</span>
                  <span className={`priority-badge priority-${(selectedTask.priority || "Medium").toLowerCase()}`}>
                    {selectedTask.priority || "Medium"}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Status</span>
                  <span className={`status-pill status-${(selectedTask.status || "To Do").toLowerCase().replace(" ", "")}`}>
                    {selectedTask.status || "To Do"}
                  </span>
                </div>
                <div className="metric-item">
                  <span>Due Date</span>
                  <div className="due-date-cell">
                    <span className="date-text">{formatDate(selectedTask.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-content-grid">
              <div className="detail-left-pane">
                <div className="detail-tabs">
                  <button className="detail-tab-btn active">Description</button>
                  <button className="detail-tab-btn">Attachments</button>
                  <button className="detail-tab-btn">Comments</button>
                </div>

                <div className="requirements-section">
                  <h4>Task Description & Guidelines</h4>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13.5px", lineHeight: "1.6", margin: "0 0 20px 0" }}>
                    {selectedTask.description || "No detailed description was provided for this task."}
                  </p>

                  <h4>Design & Dev Requirements</h4>
                  <div className="requirements-list">
                    <div className="requirement-item">
                      <FaCheck /> Modern and responsive layout compliance
                    </div>
                    <div className="requirement-item">
                      <FaCheck /> Accessible color ratios and contrast
                    </div>
                    <div className="requirement-item">
                      <FaCheck /> Performance optimized loading states
                    </div>
                  </div>
                </div>

                <div className="attachments-section">
                  <h4>Attachments</h4>
                  <div className="attachments-list">
                    {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px" }}>No attachments found.</span>
                    ) : (
                      selectedTask.attachments.map((file, fIdx) => (
                        <div className="attachment-file-row" key={fIdx}>
                          <div className="attachment-info">
                            <span className="attachment-name">{file.filename}</span>
                            <span className="attachment-size">Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          <a href={file.url} download className="attachment-download-btn" target="_blank" rel="noreferrer">
                            <FaDownload />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <div className="file-drop-area">
                      <span>Drag & drop files here or <strong>browse</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-right-pane">
                <div className="people-block">
                  <div className="people-row">
                    <span>Assigned To</span>
                    {selectedTask.assignedTo ? (
                      <div className="people-user">
                        <div className="assignee-avatar">
                          {selectedTask.assignedTo.name?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="people-user-info">
                          <h5>{selectedTask.assignedTo.name}</h5>
                          <span>{selectedTask.assignedTo.email}</span>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>No assignee</p>
                    )}
                  </div>

                  <div className="people-row">
                    <span>Created By</span>
                    <div className="people-user">
                      <div className="assignee-avatar" style={{ background: "#10b981" }}>
                        {selectedTask.createdBy?.name ? selectedTask.createdBy.name.substring(0, 2).toUpperCase() : "UA"}
                      </div>
                      <div className="people-user-info">
                        <h5>{selectedTask.createdBy?.name || "System"}</h5>
                        <span>Task Creator</span>
                      </div>
                    </div>
                  </div>

                  <div className="last-updated-block">
                    <span>Last Updated</span>
                    <p>{selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleString() : "Just now"}</p>
                  </div>

                  <div className="people-row" style={{ marginTop: "10px" }}>
                    <span>Completion Progress</span>
                    <div className="circular-progress-box">
                      <div className="progress-circle-svg">
                        <svg>
                          <defs>
                            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          <circle className="circle-bg" cx="30" cy="30" r="24" />
                          <circle
                            className="circle-val"
                            cx="30"
                            cy="30"
                            r="24"
                            strokeDasharray={2 * Math.PI * 24}
                            strokeDashoffset={2 * Math.PI * 24 * (1 - (selectedTask.progress !== undefined ? selectedTask.progress : 50) / 100)}
                          />
                        </svg>
                        <div className="progress-circle-text">
                          {selectedTask.progress !== undefined ? selectedTask.progress : 50}%
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Visualizer</span>
                        <p style={{ margin: "2px 0 0 0", fontSize: "13px", fontWeight: "600" }}>Task Status Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Creation & Editing Modal */}
      {showCreateModal && (
        <div className="task-modal-overlay">
          <div className="task-modal-card">
            <div className="task-modal-header">
              <h3>{editingTask ? "Edit Task" : "Create New Task"}</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="task-modal-form">
                <div className="form-group">
                  <label>Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={!isOwnerOrAdmin()}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Enter task guidelines..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!isOwnerOrAdmin()}
                  ></textarea>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Project</label>
                    <select
                      value={formData.project}
                      onChange={(e) => {
                        const newProjId = e.target.value;
                        const assignees = getProjectAssignees(newProjId);
                        setFormData({
                          ...formData,
                          project: newProjId,
                          assignedTo: assignees[0]?._id || "",
                        });
                      }}
                      disabled={!isOwnerOrAdmin()}
                    >
                      {projects.map((proj) => (
                        <option key={proj._id} value={proj._id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      disabled={!isOwnerOrAdmin()}
                    >
                      {getProjectAssignees().map((userItem) => (
                        <option key={userItem._id} value={userItem._id}>{userItem.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      disabled={!isOwnerOrAdmin()}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      disabled={!isOwnerOrAdmin()}
                    />
                  </div>

                  <div className="form-group">
                    <label>Completion Progress (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={formData.progress}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setFormData({ ...formData, progress: "" });
                        } else {
                          const num = Number(val);
                          if (num >= 0 && num <= 100) {
                            setFormData({ ...formData, progress: num });
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="task-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  {editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Tasks;

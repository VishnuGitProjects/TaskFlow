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
  addTaskAttachment,
  addTaskComment,
  replyToTaskComment,
} from "../../services/taskService";
import { getProjects } from "../../services/projectService";
import { getUsers } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { canManageProject } from "../../app/helpers/projectPermissions";
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
  const [commentText, setCommentText] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "To Do",
    priority: "Medium",
    dueDate: "",
    project: "",
    assignedTo: "",
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

  const canManageProjectTasks = (project) => {
    return canManageProject(project, user);
  };

  // Stats Counters
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === "To Do").length;
  const inProgressCount = tasks.filter((t) => t.status === "In Progress").length;
  const reviewCount = tasks.filter((t) => t.status === "Review").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const manageableProjects = projects.filter((project) => canManageProjectTasks(project));

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
    const firstProjId = manageableProjects[0]?._id || "";
    const assignees = getProjectAssignees(firstProjId);
    setFormData({
      title: "",
      description: "",
      status: "To Do",
      priority: "Medium",
      dueDate: "",
      project: firstProjId,
      assignedTo: assignees[0]?._id || "",
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
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const payload = canEditTaskMetadata()
          ? { ...formData }
          : { status: formData.status };
        const updated = await updateTask(editingTask._id, payload);
        if (selectedTask?._id === editingTask._id) {
          setSelectedTask(updated);
        }
      } else {
        await createTask({ ...formData });
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
    return manageableProjects.length > 0;
  };

  const canEditTask = (task) => {
    if (!task) return false;

    const projectId = task.project?._id || task.project;
    const project = projects.find((item) => String(item._id) === String(projectId));
    if (canManageProjectTasks(project)) {
      return true;
    }

    return String(task.assignedTo?._id || task.assignedTo || "") === String(user?._id);
  };

  const canEditTaskMetadata = () => {
    return isOwnerOrAdmin();
  };

  const canEditTaskStatus = () => {
    if (!editingTask) {
      return isOwnerOrAdmin();
    }

    if (isOwnerOrAdmin()) {
      return true;
    }

    return String(editingTask.assignedTo?._id || editingTask.assignedTo || "") === String(user?._id);
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

  const syncTaskInState = (updatedTask) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
    setSelectedTask(updatedTask);
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;
    try {
      const updatedTask = await addTaskComment(selectedTask._id, { message: commentText.trim() });
      syncTaskInState(updatedTask);
      setCommentText("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add comment");
    }
  };

  const handleReplyToComment = async (commentId) => {
    const replyMessage = (replyDrafts[commentId] || "").trim();
    if (!selectedTask || !replyMessage) return;

    try {
      const updatedTask = await replyToTaskComment(selectedTask._id, commentId, { message: replyMessage });
      syncTaskInState(updatedTask);
      setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add reply");
    }
  };

  const handleAttachmentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTask) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, DOC, DOCX, JPG, and PNG files are supported.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingAttachment(true);
      const fileDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const updatedTask = await addTaskAttachment(selectedTask._id, {
        filename: file.name,
        url: fileDataUrl,
        mimeType: file.type,
        size: file.size,
      });

      syncTaskInState(updatedTask);
      event.target.value = "";
    } catch (error) {
      alert(error.response?.data?.message || "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasksList.map((task) => {
                  const priority = task.priority || "Medium";
                  const status = task.status || "To Do";

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
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions-cell">
                          {canEditTask(task) && (
                            <button className="table-action-btn" onClick={() => handleOpenEdit(task)}>
                              <FaPen />
                            </button>
                          )}
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
                            <span className="attachment-size">
                              Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                              {file.uploadedBy?.name ? ` by ${file.uploadedBy.name}` : ""}
                            </span>
                          </div>
                          <a href={file.url} download className="attachment-download-btn" target="_blank" rel="noreferrer">
                            <FaDownload />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <label className="file-drop-area" style={{ cursor: "pointer" }}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        onChange={handleAttachmentUpload}
                        disabled={uploadingAttachment}
                      />
                      <span>{uploadingAttachment ? "Uploading attachment..." : "Upload PDF, DOC, DOCX, JPG, or PNG"}</span>
                    </label>
                  </div>
                </div>

                <div className="attachments-section">
                  <h4>Comments</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment for the team..."
                      style={{
                        minHeight: "90px",
                        borderRadius: "12px",
                        background: "rgba(15,23,42,0.7)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                        padding: "14px",
                        resize: "vertical",
                      }}
                    />
                    <div>
                      <button className="btn-create-task" onClick={handleAddComment}>
                        <FaCheck /> Post Comment
                      </button>
                    </div>
                    {!selectedTask.comments || selectedTask.comments.length === 0 ? (
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px" }}>No comments yet.</span>
                    ) : (
                      selectedTask.comments.map((comment) => (
                        <div
                          key={comment._id}
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "14px",
                            padding: "14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                            <strong style={{ color: "#fff" }}>{comment.author?.name || "Team Member"}</strong>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.75)", margin: 0 }}>{comment.message}</p>

                          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(comment.replies || []).map((reply) => (
                              <div
                                key={reply._id}
                                style={{
                                  marginLeft: "16px",
                                  paddingLeft: "12px",
                                  borderLeft: "2px solid rgba(59,130,246,0.45)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
                                  <strong style={{ color: "#dbeafe", fontSize: "13px" }}>{reply.author?.name || "Team Member"}</strong>
                                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                                    {new Date(reply.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: "13px" }}>{reply.message}</p>
                              </div>
                            ))}

                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <input
                                type="text"
                                value={replyDrafts[comment._id] || ""}
                                onChange={(e) =>
                                  setReplyDrafts((current) => ({ ...current, [comment._id]: e.target.value }))
                                }
                                placeholder="Reply to this comment"
                                style={{
                                  flex: 1,
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  background: "rgba(15,23,42,0.7)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  color: "#fff",
                                }}
                              />
                              <button className="btn-filter-task" onClick={() => handleReplyToComment(comment._id)}>
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
                    <span>Current Stage</span>
                    <p style={{ margin: "6px 0 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px" }}>
                      This task is currently in the <strong style={{ color: "#fff" }}>{selectedTask.status || "To Do"}</strong> stage.
                    </p>
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
                    disabled={!canEditTaskMetadata()}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    placeholder="Enter task guidelines..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!canEditTaskMetadata()}
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
                      disabled={!canEditTaskMetadata()}
                    >
                      {(editingTask ? projects : manageableProjects).map((proj) => (
                        <option key={proj._id} value={proj._id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      disabled={!canEditTaskMetadata()}
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
                      disabled={!canEditTaskMetadata()}
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
                      disabled={!canEditTaskStatus()}
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
                      disabled={!canEditTaskMetadata()}
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

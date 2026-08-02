import React, { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { APP_CONFIG } from "../../app/config/appConfig";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaFolderOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
} from "react-icons/fa";
import "../../styles/progress.css";

const Progress = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [showProjMenu, setShowProjMenu] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projData, taskData] = await Promise.all([
          getProjects(),
          getTasks()
        ]);
        setProjects(projData);
        setTasks(taskData);
      } catch (err) {
        console.error("Failed to load progress data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper: map project status
  const getProjectStatus = (proj) => {
    if (proj.status === "Completed") return "On Track";
    if (proj.status === "On Hold" || proj.status === "Cancelled") return "At Risk";
    if (proj.endDate && new Date(proj.endDate) < new Date() && proj.progress < 100) {
      return "Overdue";
    }
    if (proj.progress < 30 && proj.status === "In Progress") return "At Risk";
    return "On Track";
  };

  // Filter project data
  const filteredProjects = selectedProject === "All Projects"
    ? projects
    : projects.filter(p => p.name === selectedProject);

  const selectedProjectId = selectedProject === "All Projects"
    ? null
    : projects.find(p => p.name === selectedProject)?._id;

  const filteredTasks = selectedProjectId
    ? tasks.filter(t => t.project === selectedProjectId)
    : tasks;

  // Calculations
  const totalProjects = filteredProjects.length;
  const avgProgress = totalProjects > 0
    ? Math.round(filteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjects)
    : 0;

  const onTrackCount = filteredProjects.filter(p => getProjectStatus(p) === "On Track").length;
  const atRiskCount = filteredProjects.filter(p => getProjectStatus(p) === "At Risk").length;
  const overdueCount = filteredProjects.filter(p => getProjectStatus(p) === "Overdue").length;

  const onTrackPercent = totalProjects > 0 ? Math.round((onTrackCount / totalProjects) * 100) : 0;
  const atRiskPercent = totalProjects > 0 ? Math.round((atRiskCount / totalProjects) * 100) : 0;
  const overduePercent = totalProjects > 0 ? Math.round((overdueCount / totalProjects) * 100) : 0;

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "Completed").length;
  const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Tasks by Status
  const taskCompletedCount = filteredTasks.filter(t => t.status === "Completed").length;
  const taskInProgressCount = filteredTasks.filter(t => t.status === "In Progress" || t.status === "Review").length;
  const taskPendingCount = filteredTasks.filter(t => t.status === "To Do" || t.status === "To-Do" || t.status === "Pending").length;
  const taskOverdueCount = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;

  // Milestone Progress (Critical or High priority tasks)
  const milestoneTasks = filteredTasks.filter(t => t.priority === "Critical" || t.priority === "High");
  const totalMilestones = milestoneTasks.length;
  const milestoneCompleted = milestoneTasks.filter(t => t.status === "Completed").length;
  const milestoneInProgress = milestoneTasks.filter(t => t.status === "In Progress" || t.status === "Review").length;
  const milestonePending = milestoneTasks.filter(t => t.status === "To Do" || t.status === "To-Do" || t.status === "Pending").length;
  const milestoneOverdue = milestoneTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;

  // Time Tracked estimation (completed task priorities mapped to hours)
  const getTaskHours = (task) => {
    if (task.priority === "Critical") return 16;
    if (task.priority === "High") return 8;
    if (task.priority === "Medium") return 4;
    return 2;
  };
  const totalHoursTracked = filteredTasks.filter(t => t.status === "Completed").reduce((acc, t) => acc + getTaskHours(t), 0);
  const timeTrackedText = totalHoursTracked > 0 ? `${totalHoursTracked}h 00m` : "0h 00m";

  // Dynamic Priority Distribution (Low, Medium, High, Critical)
  const lowCount = filteredTasks.filter(t => t.priority === "Low" || t.priority === "low").length;
  const mediumCount = filteredTasks.filter(t => t.priority === "Medium" || t.priority === "medium").length;
  const highCount = filteredTasks.filter(t => t.priority === "High" || t.priority === "high").length;
  const criticalCount = filteredTasks.filter(t => t.priority === "Critical" || t.priority === "critical").length;
  const maxPriorityCount = Math.max(lowCount, mediumCount, highCount, criticalCount, 1);

  const getBarHeight = (count) => {
    return (count / maxPriorityCount) * 50; // max height is 50px
  };

  // SVG drawing paths
  const getLinePath = () => {
    if (totalProjects === 0) return "M 10 160 L 490 160";
    if (totalProjects === 1) {
      const y = 160 - ((filteredProjects[0].progress || 0) / 100) * 130;
      return `M 10 160 L 490 ${y}`;
    }
    const sorted = [...filteredProjects].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let cumulative = 0;
    const points = sorted.map((p, idx) => {
      cumulative += (p.progress || 0);
      const avg = cumulative / (idx + 1);
      const x = 10 + (idx / (sorted.length - 1)) * 480;
      const y = 160 - (avg / 100) * 130;
      return `${x} ${y}`;
    });
    return `M ${points.join(" L ")}`;
  };

  const getAreaPath = () => {
    if (totalProjects === 0) return "M 10 160 L 490 160 L 490 190 L 10 190 Z";
    if (totalProjects === 1) {
      const y = 160 - ((filteredProjects[0].progress || 0) / 100) * 130;
      return `M 10 190 L 10 160 L 490 ${y} L 490 190 Z`;
    }
    const sorted = [...filteredProjects].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let cumulative = 0;
    const points = sorted.map((p, idx) => {
      cumulative += (p.progress || 0);
      const avg = cumulative / (idx + 1);
      const x = 10 + (idx / (sorted.length - 1)) * 480;
      const y = 160 - (avg / 100) * 130;
      return `${x} ${y}`;
    });
    return `M 10 190 L ${points.join(" L ")} L 490 190 Z`;
  };

  // Donut values calculations
  const getDonutData = (comp, ip, pend, od, total) => {
    if (total === 0) return { completed: "0 100", inProgress: "0 100", pending: "0 100", overdue: "0 100", compOffset: 0, ipOffset: 0, pendOffset: 0, odOffset: 0 };
    const c = Math.round((comp / total) * 100);
    const progress = Math.round((ip / total) * 100);
    const p = Math.round((pend / total) * 100);
    const overdue = Math.round((od / total) * 100);

    return {
      completed: `${c} ${100 - c}`,
      inProgress: `${progress} ${100 - progress}`,
      pending: `${p} ${100 - p}`,
      overdue: `${overdue} ${100 - overdue}`,
      compOffset: 25,
      ipOffset: 25 - c,
      pendOffset: 25 - c - progress,
      odOffset: 25 - c - progress - p
    };
  };

  const msDonut = getDonutData(milestoneCompleted, milestoneInProgress, milestonePending, milestoneOverdue, totalMilestones);
  const taskDonut = getDonutData(taskCompletedCount, taskInProgressCount, taskPendingCount, taskOverdueCount, totalTasks);

  // Recent Activity (Tasks sorted by updatedAt desc)
  const recentActivities = [...filteredTasks]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  // Upcoming Milestones (Tasks with dueDate in the future)
  const upcomingMilestones = [...milestoneTasks]
    .filter(t => t.dueDate && new Date(t.dueDate) > new Date() && t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  const getMonthAbbr = (dateStr) => {
    if (!dateStr) return "JUN";
    return new Date(dateStr).toLocaleString("en-US", { month: "short" }).toUpperCase();
  };

  const getDayNum = (dateStr) => {
    if (!dateStr) return "01";
    const d = new Date(dateStr).getDate();
    return d < 10 ? `0${d}` : d;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <MainLayout>
      <div className="progress-wrapper">
        {/* Top Header Section */}
        <div className="progress-top-bar">
          <div className="progress-welcome">
            <h1>Progress Tracking</h1>
            <div className="breadcrumbs">
              Dashboard <span>&gt;</span> Progress Tracking <span>&gt;</span> Overview
            </div>
          </div>
          <div className="progress-filters">
            <div className="filter-dropdown-container" style={{ position: "relative" }}>
              <div className="filter-dropdown" onClick={() => setShowProjMenu(!showProjMenu)}>
                <FaFolderOpen className="filter-icon" />
                <span>{selectedProject}</span>
                <FaChevronDown className="chevron-icon" />
              </div>
              {showProjMenu && (
                <div className="dropdown-menu-list">
                  <div className="dropdown-menu-item" onClick={() => { setSelectedProject("All Projects"); setShowProjMenu(false); }}>
                    All Projects
                  </div>
                  {projects.map(p => (
                    <div key={p._id} className="dropdown-menu-item" onClick={() => { setSelectedProject(p.name); setShowProjMenu(false); }}>
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="filter-dropdown calendar-filter">
              <FaCalendarAlt className="filter-icon" />
              <span>Current Timeframe</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "rgba(255,255,255,0.4)" }}>
            <h3>Loading dashboard metrics...</h3>
          </div>
        ) : (
          <>
            {/* Top Summary Cards Row */}
            <div className="progress-stats-grid">
              {/* Card 1: Overall Progress Ring */}
              <div className="progress-stat-card card-overall">
                <div className="ring-container">
                  <svg width="76" height="76" viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path className="circle"
                      strokeDasharray={`${avgProgress}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="21" className="percentage">{avgProgress}%</text>
                  </svg>
                </div>
                <div className="card-info">
                  <span className="card-label">Overall Progress</span>
                  <span className="card-subtext">
                    {avgProgress >= 70 ? "Excellent status!" : avgProgress >= 40 ? "On track progress" : "Needs attention"}
                  </span>
                </div>
              </div>

              {/* Card 2: Projects */}
              <div className="progress-stat-card text-card purple-theme">
                <div className="card-text-content">
                  <span className="card-label">Projects</span>
                  <h2 className="card-value">{totalProjects}</h2>
                  <span className="card-trend trend-green">{onTrackPercent}% On Track</span>
                </div>
                <div className="card-icon-wrapper">
                  <FaFolderOpen />
                </div>
              </div>

              {/* Card 3: Tasks Completed */}
              <div className="progress-stat-card text-card blue-theme">
                <div className="card-text-content">
                  <span className="card-label">Tasks Completed</span>
                  <h2 className="card-value">{completedTasks} / {totalTasks}</h2>
                  <span className="card-trend trend-blue">{completedPercent}% Completed</span>
                </div>
                <div className="card-icon-wrapper">
                  <FaCheckCircle />
                </div>
              </div>

              {/* Card 4: On Track */}
              <div className="progress-stat-card text-card green-theme">
                <div className="card-text-content">
                  <span className="card-label">On Track</span>
                  <h2 className="card-value">{onTrackCount}</h2>
                  <span className="card-trend trend-green">{onTrackPercent}% of projects</span>
                </div>
                <div className="card-icon-wrapper">
                  <FaCheckCircle />
                </div>
              </div>

              {/* Card 5: At Risk */}
              <div className="progress-stat-card text-card orange-theme">
                <div className="card-text-content">
                  <span className="card-label">At Risk</span>
                  <h2 className="card-value">{atRiskCount}</h2>
                  <span className="card-trend trend-orange">{atRiskPercent}% of projects</span>
                </div>
                <div className="card-icon-wrapper">
                  <FaExclamationTriangle />
                </div>
              </div>

              {/* Card 6: Overdue */}
              <div className="progress-stat-card text-card red-theme">
                <div className="card-text-content">
                  <span className="card-label">Overdue</span>
                  <h2 className="card-value">{overdueCount}</h2>
                  <span className="card-trend trend-red">{overduePercent}% of projects</span>
                </div>
                <div className="card-icon-wrapper">
                  <FaClock />
                </div>
              </div>
            </div>

            {/* Row 2: Charts */}
            <div className="progress-charts-row-1">
              {/* Progress Over Time Graph */}
              <div className="chart-card flex-2">
                <div className="chart-header">
                  <h3>Progress Over Time</h3>
                  <div className="chart-actions">
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Cumulative Project Average</span>
                  </div>
                </div>
                <div className="line-chart-container">
                  <svg className="custom-line-chart" viewBox="0 0 500 200" width="100%" height="100%">
                    <defs>
                      <linearGradient id="blue-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    
                    <path d={getAreaPath()} fill="url(#blue-grad)" />
                    <path d={getLinePath()} fill="none" stroke="#3b82f6" strokeWidth="3" />
                  </svg>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: "#3b82f6" }}></span>
                    <span>Actual Progress</span>
                  </div>
                </div>
              </div>

              {/* Progress by Project List */}
              <div className="chart-card flex-1">
                <div className="chart-header">
                  <h3>Progress by Project</h3>
                </div>
                <div className="projects-progress-list">
                  {totalProjects === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
                      No projects active
                    </div>
                  ) : (
                    <table className="progress-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Progress</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProjects.slice(0, 5).map((proj, idx) => {
                          const status = getProjectStatus(proj);
                          const initials = proj.name ? proj.name.substring(0, 2).toUpperCase() : "PR";
                          return (
                            <tr key={proj._id}>
                              <td>
                                <div className="project-cell">
                                  <span className={`project-avatar-badge p-color-${idx % 5}`}>
                                    {initials}
                                  </span>
                                  <span className="project-name-text">{proj.name}</span>
                                </div>
                              </td>
                              <td>
                                <div className="progress-bar-cell">
                                  <span className="progress-percent">{proj.progress || 0}%</span>
                                  <div className="progress-track-bg">
                                    <div className="progress-fill-bar" style={{
                                      width: `${proj.progress || 0}%`,
                                      background: status === "On Track" ? "#3b82f6" : status === "At Risk" ? "#f59e0b" : "#ef4444"
                                    }}></div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge-progress status-${status.toLowerCase().replace(" ", "-")}`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Milestones, Status & Time Tracked */}
            <div className="progress-charts-row-2">
              {/* Milestone Progress */}
              <div className="chart-card text-center">
                <div className="chart-header">
                  <h3>Milestone Progress</h3>
                </div>
                <div className="donut-chart-container">
                  <svg width="120" height="120" viewBox="0 0 36 36" className="donut-chart">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.2" strokeDasharray={msDonut.completed} strokeDashoffset={msDonut.compOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.2" strokeDasharray={msDonut.inProgress} strokeDashoffset={msDonut.ipOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeDasharray={msDonut.pending} strokeDashoffset={msDonut.pendOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.2" strokeDasharray={msDonut.overdue} strokeDashoffset={msDonut.odOffset} />
                    
                    <text x="18" y="17" className="donut-center-val">{totalMilestones}</text>
                    <text x="18" y="24" className="donut-center-lbl">Key Tasks</text>
                  </svg>
                </div>
                <div className="donut-labels">
                  <div className="donut-label-item">
                    <span className="dot dot-green"></span>
                    <span>Completed</span>
                    <span className="donut-val">{milestoneCompleted}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-blue"></span>
                    <span>In Progress</span>
                    <span className="donut-val">{milestoneInProgress}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-orange"></span>
                    <span>Pending</span>
                    <span className="donut-val">{milestonePending}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-red"></span>
                    <span>Overdue</span>
                    <span className="donut-val">{milestoneOverdue}</span>
                  </div>
                </div>
              </div>

              {/* Tasks by Status */}
              <div className="chart-card text-center">
                <div className="chart-header">
                  <h3>Tasks by Status</h3>
                </div>
                <div className="donut-chart-container">
                  <svg width="120" height="120" viewBox="0 0 36 36" className="donut-chart">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.2" strokeDasharray={taskDonut.completed} strokeDashoffset={taskDonut.compOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.2" strokeDasharray={taskDonut.inProgress} strokeDashoffset={taskDonut.ipOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.2" strokeDasharray={taskDonut.pending} strokeDashoffset={taskDonut.pendOffset} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.2" strokeDasharray={taskDonut.overdue} strokeDashoffset={taskDonut.odOffset} />
                    
                    <text x="18" y="17" className="donut-center-val">{totalTasks}</text>
                    <text x="18" y="24" className="donut-center-lbl">Total Tasks</text>
                  </svg>
                </div>
                <div className="donut-labels">
                  <div className="donut-label-item">
                    <span className="dot dot-green"></span>
                    <span>Completed</span>
                    <span className="donut-val">{taskCompletedCount}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-blue"></span>
                    <span>In Progress</span>
                    <span className="donut-val">{taskInProgressCount}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-orange"></span>
                    <span>Pending</span>
                    <span className="donut-val">{taskPendingCount}</span>
                  </div>
                  <div className="donut-label-item">
                    <span className="dot dot-red"></span>
                    <span>Overdue</span>
                    <span className="donut-val">{taskOverdueCount}</span>
                  </div>
                </div>
              </div>

              {/* Time Tracked Chart */}
              <div className="chart-card text-center">
                <div className="chart-header">
                  <h3>Est. Effort Effort</h3>
                </div>
                <div className="time-tracked-summary">
                  <div className="time-tracked-val" style={{ textAlign: "left" }}>
                    <h2>{timeTrackedText}</h2>
                    <span className="time-lbl">Calculated completed effort</span>
                  </div>
                </div>
                <div className="bar-chart-container">
                  <svg className="custom-bar-chart" viewBox="0 0 240 70" width="100%" height="100%">
                    <rect x="22" y={60 - getBarHeight(lowCount)} width="16" height={getBarHeight(lowCount)} fill="#3b82f6" rx="2" />
                    <rect x="82" y={60 - getBarHeight(mediumCount)} width="16" height={getBarHeight(mediumCount)} fill="#8b5cf6" rx="2" />
                    <rect x="142" y={60 - getBarHeight(highCount)} width="16" height={getBarHeight(highCount)} fill="#f59e0b" rx="2" />
                    <rect x="202" y={60 - getBarHeight(criticalCount)} width="16" height={getBarHeight(criticalCount)} fill="#ef4444" rx="2" />
                  </svg>
                  <div className="bar-labels" style={{ marginTop: "12px" }}>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                    <span>Critical</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Recent Activity and Upcoming Milestones */}
            <div className="progress-charts-row-1">
              {/* Recent Activity */}
              <div className="chart-card flex-2">
                <div className="chart-header">
                  <h3>Recent Tasks</h3>
                </div>
                <div className="activity-list-container">
                  {recentActivities.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
                      No recent tasks modified
                    </div>
                  ) : (
                    recentActivities.map((task) => {
                      const projName = projects.find(p => p._id === task.project)?.name || APP_CONFIG.appName;
                      const date = formatDate(task.updatedAt);
                      const initials = task.title ? task.title.substring(0, 2).toUpperCase() : "TS";
                      const status = task.status === "Completed" ? "Completed" : task.status === "In Progress" ? "In Progress" : "Pending";

                      return (
                        <div key={task._id} className="activity-item">
                          <div className={`act-icon ${
                            status === "Completed" ? "icon-circle-green" : status === "In Progress" ? "icon-circle-orange" : "icon-circle-red"
                          }`}>
                            <FaCheckCircle />
                          </div>
                          <div className="act-desc">
                            <h4>{task.title} <span className={`act-badge ${
                              status === "Completed" ? "act-bg-green" : status === "In Progress" ? "act-bg-orange" : "act-bg-red"
                            }`}>{status}</span></h4>
                            <p>{projName}</p>
                          </div>
                          <div className="act-time-user">
                            <span className="act-date">{date}</span>
                            <div className="act-user-circle">{initials}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Upcoming Milestones */}
              <div className="chart-card flex-1">
                <div className="chart-header">
                  <h3>Upcoming Deadlines</h3>
                </div>
                <div className="milestones-vertical-list">
                  {upcomingMilestones.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>
                      No upcoming deadlines
                    </div>
                  ) : (
                    upcomingMilestones.map((task) => {
                      const projName = projects.find(p => p._id === task.project)?.name || APP_CONFIG.appName;
                      const month = getMonthAbbr(task.dueDate);
                      const day = getDayNum(task.dueDate);

                      return (
                        <div key={task._id} className="milestone-item-row">
                          <div className="milestone-date-box">
                            <span className="m-month">{month}</span>
                            <span className="m-day">{day}</span>
                          </div>
                          <div className="milestone-info-col">
                            <h4>{task.title}</h4>
                            <p>{projName}</p>
                          </div>
                          <span className="status-badge-progress status-at-risk">
                            At Risk
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Progress;

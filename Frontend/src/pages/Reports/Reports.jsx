import React, { useState, useEffect } from "react";
import MainLayout from "../../layouts/MainLayout";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";
import { getTeams } from "../../services/teamService";
import { exportReportPDF } from "../../services/reportService";
import {
  FaFolder,
  FaCheckCircle,
  FaChartPie,
  FaClock,
  FaExclamationTriangle,
  FaUsers,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaUser,
  FaTasks,
} from "react-icons/fa";
import "../../styles/reports.css";

const Reports = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Filters State
  const [filterProject, setFilterProject] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Custom report builder state
  const [customReportType, setCustomReportType] = useState("projects");
  const [customSortBy, setCustomSortBy] = useState("createdAt");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, taskRes, userRes, teamRes] = await Promise.all([
          getProjects(),
          getTasks(),
          getUsers(),
          getTeams(),
        ]);
        setProjects(projRes || []);
        setTasks(taskRes || []);
        setUsers(userRes || []);
        setTeams(teamRes || []);
      } catch (err) {
        console.error("Error fetching reports data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter application
  const filteredProjects = projects.filter((proj) => {
    if (filterProject !== "All" && proj._id !== filterProject) return false;
    if (startDate && new Date(proj.createdAt || proj.startDate) < new Date(startDate)) return false;
    if (endDate && new Date(proj.createdAt || proj.startDate) > new Date(endDate)) return false;
    return true;
  });

  const filteredTasks = tasks.filter((task) => {
    const projId = task.project?._id || task.project;
    if (filterProject !== "All" && projId !== filterProject) return false;
    if (startDate && new Date(task.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(task.createdAt) > new Date(endDate)) return false;
    return true;
  });

  // Summary counts
  const totalProjects = filteredProjects.length;
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === "Completed");
  const completedTasksCount = completedTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
  
  const overdueTasksCount = filteredTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed"
  ).length;

  const activeUsersCount = users.filter((u) => u.isActive).length;

  // Est effort calculations
  const getTaskHours = (task) => {
    if (task.priority === "Critical") return 16;
    if (task.priority === "High") return 8;
    if (task.priority === "Medium") return 4;
    return 2;
  };
  const totalHoursTracked = completedTasks.reduce((acc, t) => acc + getTaskHours(t), 0);
  const timeTrackedText = totalHoursTracked > 0 ? `${totalHoursTracked}h 00m` : "0h 00m";

  // Get date range of actual user data in the DB
  const getProjectDateRange = () => {
    if (filteredProjects.length === 0 && filteredTasks.length === 0) {
      return "No dates recorded";
    }
    const dates = [];
    filteredProjects.forEach((p) => {
      if (p.startDate) dates.push(new Date(p.startDate));
      if (p.endDate) dates.push(new Date(p.endDate));
      if (p.createdAt) dates.push(new Date(p.createdAt));
    });
    filteredTasks.forEach((t) => {
      if (t.dueDate) dates.push(new Date(t.dueDate));
      if (t.createdAt) dates.push(new Date(t.createdAt));
    });
    if (dates.length === 0) {
      return "No dates recorded";
    }
    const minD = new Date(Math.min(...dates));
    const maxD = new Date(Math.max(...dates));
    
    const format = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const yearMin = minD.getFullYear();
    const yearMax = maxD.getFullYear();
    
    if (yearMin === yearMax) {
      return `${format(minD)} – ${format(maxD)}, ${yearMin}`;
    }
    return `${format(minD)}, ${yearMin} – ${format(maxD)}, ${yearMax}`;
  };

  // Timeline calculation for line chart (Last 15 Days of database activity)
  const getTimelineData = () => {
    const dates = [];
    filteredProjects.forEach((p) => {
      if (p.startDate) dates.push(new Date(p.startDate));
      if (p.createdAt) dates.push(new Date(p.createdAt));
    });
    filteredTasks.forEach((t) => {
      if (t.createdAt) dates.push(new Date(t.createdAt));
    });

    const minD = dates.length > 0 ? new Date(Math.min(...dates)) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const maxD = new Date(); // up to today
    
    const diffTime = Math.max(maxD - minD, 1);
    const step = diffTime / 14;

    const data = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(minD.getTime() + step * i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const completedOnOrBefore = filteredTasks.filter((t) => {
        if (t.status !== "Completed" || !t.updatedAt) return false;
        const compDate = new Date(t.updatedAt);
        return compDate <= d;
      }).length;
      
      data.push({ label, value: completedOnOrBefore, date: d });
    }
    return data;
  };

  const timelineData = getTimelineData();
  const maxTimelineValue = Math.max(...timelineData.map((d) => d.value), 1);

  const getLinePath = () => {
    const points = timelineData.map((d, idx) => {
      const x = 20 + (idx / 14) * 460;
      const y = 170 - (d.value / maxTimelineValue) * 140;
      return `${x} ${y}`;
    });
    return `M 20 170 L ${points.join(" L ")}`;
  };

  const getAreaPath = () => {
    const points = timelineData.map((d, idx) => {
      const x = 20 + (idx / 14) * 460;
      const y = 170 - (d.value / maxTimelineValue) * 140;
      return `${x} ${y}`;
    });
    return `M 20 170 L ${points.join(" L ")} L 480 170 Z`;
  };

  // Donut chart calculations
  const getDonutData = (comp, ip, pend, od, total) => {
    if (total === 0) {
      return {
        completed: "0 100",
        inProgress: "0 100",
        pending: "0 100",
        overdue: "0 100",
        compOffset: 0,
        ipOffset: 0,
        pendOffset: 0,
        odOffset: 0,
      };
    }
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
      odOffset: 25 - c - progress - p,
      cPercent: c,
      ipPercent: progress,
      pPercent: p,
      odPercent: overdue,
    };
  };

  // Task Status counts
  const taskInProgressCount = filteredTasks.filter((t) => t.status === "In Progress" || t.status === "Review").length;
  const taskPendingCount = filteredTasks.filter((t) => t.status === "To Do" || t.status === "Pending").length;
  const statusDonut = getDonutData(completedTasksCount, taskInProgressCount, taskPendingCount, overdueTasksCount, totalTasks);

  // Task Priority counts
  const highCount = filteredTasks.filter((t) => t.priority === "High" || t.priority === "Critical").length;
  const mediumCount = filteredTasks.filter((t) => t.priority === "Medium").length;
  const lowCount = filteredTasks.filter((t) => t.priority === "Low").length;
  const priorityDonut = getDonutData(highCount, mediumCount, lowCount, 0, totalTasks);

  // Project details calculations
  const getProjectTasksInfo = (projId) => {
    const projTasks = filteredTasks.filter((t) => t.project === projId || (t.project && t.project._id === projId));
    const comp = projTasks.filter((t) => t.status === "Completed").length;
    const od = projTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;
    return { comp, total: projTasks.length, od };
  };

  // Time Tracked Overview (15 Days Bar Chart aligned to dynamic timeline)
  const getDailyHoursData = () => {
    return timelineData.map((day) => {
      const d = day.date;
      return filteredTasks
        .filter((t) => {
          if (t.status !== "Completed" || !t.updatedAt) return false;
          const compDate = new Date(t.updatedAt);
          return compDate.toDateString() === d.toDateString();
        })
        .reduce((sum, t) => sum + getTaskHours(t), 0);
    });
  };

  const dailyHours = getDailyHoursData();
  const maxHours = Math.max(...dailyHours, 1);

  // Top Performing Teams
  const teamPerformanceList = teams.map((team) => {
    const memberIds = (team.members || []).map((m) => m._id || m);
    if (team.manager) {
      memberIds.push(team.manager._id || team.manager);
    }
    const teamTasks = filteredTasks.filter((t) => t.assignedTo && memberIds.includes(t.assignedTo._id || t.assignedTo));
    const comp = teamTasks.filter((t) => t.status === "Completed").length;
    const total = teamTasks.length;
    const rate = total > 0 ? Math.round((comp / total) * 100) : 0;
    
    // Unique project IDs
    const projIds = new Set(teamTasks.map((t) => t.project?._id || t.project));
    return {
      name: team.name,
      projectsCount: projIds.size,
      completed: comp,
      total,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  // Export PDF Handler
  const handleExportReport = async () => {
    try {
      setExporting(true);
      const blob = await exportReportPDF({
        projectId: filterProject,
        startDate,
        endDate,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `workspace_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to export report PDF:", err);
      alert("Failed to export PDF report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="reports-wrapper">
        {/* Top Header */}
        <div className="reports-top-bar">
          <div className="reports-header">
            <h1>Reports</h1>
            <p>Analyze performance and productivity across projects and teams.</p>
          </div>
          <div className="reports-controls">
            <button
              className={`btn-reports-filter ${showFilterPanel ? "active" : ""}`}
              onClick={() => setShowFilterPanel(!showFilterPanel)}
            >
              <FaFilter /> Filter
            </button>
            <button
              className="btn-reports-export"
              onClick={handleExportReport}
              disabled={exporting}
            >
              <FaDownload /> {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilterPanel && (
          <div className="reports-filter-panel">
            <div className="filter-group">
              <label>Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              className="btn-filter-reset"
              onClick={() => {
                setFilterProject("All");
                setStartDate("");
                setEndDate("");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="reports-tabs">
          <button
            className={`reports-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`reports-tab ${activeTab === "project" ? "active" : ""}`}
            onClick={() => setActiveTab("project")}
          >
            Project Reports
          </button>
          <button
            className={`reports-tab ${activeTab === "task" ? "active" : ""}`}
            onClick={() => setActiveTab("task")}
          >
            Task Reports
          </button>
          <button
            className={`reports-tab ${activeTab === "team" ? "active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Reports
          </button>
          <button
            className={`reports-tab ${activeTab === "user" ? "active" : ""}`}
            onClick={() => setActiveTab("user")}
          >
            User Reports
          </button>
          <button
            className={`reports-tab ${activeTab === "custom" ? "active" : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            Custom Reports
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.4)" }}>
            Loading report statistics...
          </div>
        ) : (
          <>
            {/* Stats Summary Cards Row - Always Visible */}
            <div className="reports-stats-grid">
              <div className="reports-stat-card stat-purple">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaFolder />
                  </div>
                </div>
                <div className="reports-card-label">Total Projects</div>
                <div className="reports-card-value">{totalProjects}</div>
                <div className="reports-card-trend">—</div>
              </div>

              <div className="reports-stat-card stat-green">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaCheckCircle />
                  </div>
                </div>
                <div className="reports-card-label">Tasks Completed</div>
                <div className="reports-card-value">{completedTasksCount} / {totalTasks}</div>
                <div className="reports-card-trend">—</div>
              </div>

              <div className="reports-stat-card stat-blue">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaChartPie />
                  </div>
                </div>
                <div className="reports-card-label">Completion Rate</div>
                <div className="reports-card-value">{completionRate}%</div>
                <div className="reports-card-trend">—</div>
              </div>

              <div className="reports-stat-card stat-orange">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaClock />
                  </div>
                </div>
                <div className="reports-card-label">Total Est. Effort</div>
                <div className="reports-card-value">{timeTrackedText}</div>
                <div className="reports-card-trend">—</div>
              </div>

              <div className="reports-stat-card stat-red">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaExclamationTriangle />
                  </div>
                </div>
                <div className="reports-card-label">Overdue Tasks</div>
                <div className="reports-card-value">{overdueTasksCount}</div>
                <div className="reports-card-trend">—</div>
              </div>

              <div className="reports-stat-card stat-blue">
                <div className="reports-stat-card-header">
                  <div className="reports-card-icon-container">
                    <FaUsers />
                  </div>
                </div>
                <div className="reports-card-label">Active Users</div>
                <div className="reports-card-value">{activeUsersCount}</div>
                <div className="reports-card-trend">—</div>
              </div>
            </div>

            {/* Tab Specific Content */}
            {activeTab === "overview" && (
              <>
                <div className="reports-charts-row-1">
                  <div className="reports-chart-card">
                    <div className="reports-chart-header">
                      <h3>Task Completion Trend</h3>
                    </div>
                    <div style={{ flex: 1, minHeight: "170px", position: "relative" }}>
                      <svg viewBox="0 0 500 200" width="100%" height="100%">
                        <defs>
                          <linearGradient id="blue-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1="20" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        <line x1="20" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                        <line x1="20" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        
                        {totalTasks > 0 && (
                          <>
                            <path d={getAreaPath()} fill="url(#blue-area-grad)" />
                            <path d={getLinePath()} fill="none" stroke="#3b82f6" strokeWidth="3" />
                          </>
                        )}
                      </svg>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                      <span>{timelineData[0]?.label}</span>
                      <span>{timelineData[7]?.label}</span>
                      <span>{timelineData[14]?.label}</span>
                    </div>
                  </div>

                  <div className="reports-chart-card">
                    <div className="reports-chart-header">
                      <h3>Tasks by Status</h3>
                    </div>
                    <div className="reports-donut-container">
                      <svg width="90" height="90" viewBox="0 0 36 36" className="reports-donut-chart">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3.2" />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.4" strokeDasharray={statusDonut.completed} strokeDashoffset={statusDonut.compOffset} />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.4" strokeDasharray={statusDonut.inProgress} strokeDashoffset={statusDonut.ipOffset} />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.4" strokeDasharray={statusDonut.pending} strokeDashoffset={statusDonut.pendOffset} />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.4" strokeDasharray={statusDonut.overdue} strokeDashoffset={statusDonut.odOffset} />
                        <text x="18" y="17" className="reports-donut-val">{totalTasks}</text>
                        <text x="18" y="24" className="reports-donut-lbl">Tasks</text>
                      </svg>
                      <div className="reports-donut-labels">
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></span>Completed</div>
                          <span className="reports-donut-val-text">{completedTasksCount} ({statusDonut.cPercent || 0}%)</span>
                        </div>
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%" }}></span>In Progress</div>
                          <span className="reports-donut-val-text">{taskInProgressCount} ({statusDonut.ipPercent || 0}%)</span>
                        </div>
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#f59e0b", borderRadius: "50%" }}></span>Pending</div>
                          <span className="reports-donut-val-text">{taskPendingCount} ({statusDonut.pPercent || 0}%)</span>
                        </div>
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" }}></span>Overdue</div>
                          <span className="reports-donut-val-text">{overdueTasksCount} ({statusDonut.odPercent || 0}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="reports-chart-card">
                    <div className="reports-chart-header">
                      <h3>Tasks by Priority</h3>
                    </div>
                    <div className="reports-donut-container">
                      <svg width="90" height="90" viewBox="0 0 36 36" className="reports-donut-chart">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3.2" />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.4" strokeDasharray={priorityDonut.completed} strokeDashoffset={priorityDonut.compOffset} />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.4" strokeDasharray={priorityDonut.inProgress} strokeDashoffset={priorityDonut.ipOffset} />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.4" strokeDasharray={priorityDonut.pending} strokeDashoffset={priorityDonut.pendOffset} />
                        <text x="18" y="17" className="reports-donut-val">{totalTasks}</text>
                        <text x="18" y="24" className="reports-donut-lbl">Tasks</text>
                      </svg>
                      <div className="reports-donut-labels">
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" }}></span>High/Critical</div>
                          <span className="reports-donut-val-text">{highCount} ({priorityDonut.cPercent || 0}%)</span>
                        </div>
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#f59e0b", borderRadius: "50%" }}></span>Medium</div>
                          <span className="reports-donut-val-text">{mediumCount} ({priorityDonut.ipPercent || 0}%)</span>
                        </div>
                        <div className="reports-donut-item">
                          <div className="reports-donut-item-left"><span style={{ width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%" }}></span>Low</div>
                          <span className="reports-donut-val-text">{lowCount} ({priorityDonut.pPercent || 0}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="reports-charts-row-2">
                  <div className="reports-chart-card">
                    <div className="reports-chart-header">
                      <h3>Project Performance</h3>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Completion</th>
                            <th>Tasks</th>
                            <th>Overdue</th>
                            <th>Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProjects.map((proj, idx) => {
                            const info = getProjectTasksInfo(proj._id);
                            const progress = proj.progress || 0;
                            const initials = proj.name ? proj.name.substring(0, 2).toUpperCase() : "PR";
                            const strokeColor = progress > 70 ? "#10b981" : progress > 30 ? "#f59e0b" : "#ef4444";
                            
                            const yStart = 35;
                            const yEnd = 40 - (progress / 100) * 35;
                            const sparklinePath = `M 5 35 Q 25 ${Math.min(yStart, yEnd) - 5} 45 ${yEnd}`;

                            return (
                              <tr key={proj._id}>
                                <td>
                                  <div className="reports-project-cell">
                                    <span
                                      className={`reports-project-badge p-color-${idx % 5}`}
                                      style={{
                                        background: `hsla(${(idx * 73) % 360}, 65%, 55%, 0.2)`,
                                        color: `hsl(${(idx * 73) % 360}, 80%, 75%)`,
                                        border: `1px solid hsla(${(idx * 73) % 360}, 65%, 55%, 0.3)`
                                      }}
                                    >
                                      {initials}
                                    </span>
                                    <span className="reports-project-name">{proj.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ width: "35px", fontWeight: "600" }}>{progress}%</span>
                                    <div className="reports-progress-bg">
                                      <div className="reports-progress-fill" style={{ width: `${progress}%`, background: strokeColor }}></div>
                                    </div>
                                  </div>
                                </td>
                                <td>{info.comp} / {info.total}</td>
                                <td style={{ color: info.od > 0 ? "#ef4444" : "rgba(255,255,255,0.4)", fontWeight: info.od > 0 ? "600" : "400" }}>{info.od}</td>
                                <td>
                                  <svg width="50" height="40" style={{ overflow: "visible" }}>
                                    <path d={sparklinePath} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" className="reports-sparkline" />
                                  </svg>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div className="reports-chart-card">
                      <div className="reports-chart-header">
                        <h3>Time Tracked Overview</h3>
                      </div>
                      <div style={{ display: "flex", gap: "4px", height: "70px", alignItems: "flex-end", padding: "0 10px" }}>
                        {dailyHours.map((hours, idx) => {
                          const height = (hours / maxHours) * 60;
                          return (
                            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                              <div style={{ width: "100%", height: `${Math.max(height, 2)}px`, background: "linear-gradient(180deg, #8b5cf6 0%, #3b82f6 100%)", borderRadius: "2px" }} title={`${hours} hours`}></div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                        <span>{timelineData[0]?.label}</span>
                        <span>{timelineData[14]?.label}</span>
                      </div>
                    </div>

                    <div className="reports-chart-card">
                      <div className="reports-chart-header">
                        <h3>Top Performing Teams</h3>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table className="reports-table">
                          <thead>
                            <tr>
                              <th>Team</th>
                              <th style={{ textAlign: "right" }}>Tasks</th>
                              <th style={{ textAlign: "right" }}>Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamPerformanceList.map((team, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FaUsers style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }} />
                                    <span style={{ fontWeight: "500" }}>{team.name}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: "right" }}>{team.completed} / {team.total}</td>
                                <td style={{ textAlign: "right", color: team.rate > 75 ? "#10b981" : team.rate > 45 ? "#f59e0b" : "#ef4444", fontWeight: "600" }}>
                                  {team.rate}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Project Reports Tab */}
            {activeTab === "project" && (
              <div className="reports-chart-card">
                <div className="reports-chart-header">
                  <h3>Project Deliverables & Timelines</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Timeline</th>
                        <th>Completion Rate</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((proj, idx) => {
                        const info = getProjectTasksInfo(proj._id);
                        const progress = proj.progress || 0;
                        const strokeColor = progress > 70 ? "#10b981" : progress > 30 ? "#f59e0b" : "#ef4444";
                        const initials = proj.name ? proj.name.substring(0, 2).toUpperCase() : "PR";
                        return (
                          <tr key={proj._id}>
                            <td>
                              <div className="reports-project-cell">
                                <span
                                  className="reports-project-badge"
                                  style={{
                                    background: `hsla(${(idx * 73) % 360}, 65%, 55%, 0.2)`,
                                    color: `hsl(${(idx * 73) % 360}, 80%, 75%)`
                                  }}
                                >
                                  {initials}
                                </span>
                                <div>
                                  <span className="reports-project-name" style={{ display: "block" }}>{proj.name}</span>
                                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                                    {proj.description || "No description provided."}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>{proj.owner?.name || "N/A"}</td>
                            <td>
                              <span className={`reports-badge reports-status-${proj.status?.toLowerCase().replace(" ", "-")}`}>
                                {proj.status}
                              </span>
                            </td>
                            <td>
                              <span className={`reports-badge reports-priority-${proj.priority?.toLowerCase()}`}>
                                {proj.priority}
                              </span>
                            </td>
                            <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                              {proj.startDate ? new Date(proj.startDate).toLocaleDateString() : "N/A"} - {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td>{info.comp} / {info.total} tasks</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontWeight: "600" }}>{progress}%</span>
                                <div className="reports-progress-bg">
                                  <div className="reports-progress-fill" style={{ width: `${progress}%`, background: strokeColor }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Task Reports Tab */}
            {activeTab === "task" && (
              <div className="reports-chart-card">
                <div className="reports-chart-header">
                  <h3>Task Status & Allocation Report</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Assignee</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Est. Effort</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => {
                        const projName = task.project?.name || "General";
                        return (
                          <tr key={task._id}>
                            <td>
                              <div>
                                <span style={{ fontWeight: "600", display: "block" }}>{task.title}</span>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                                  {task.description || "No description."}
                                </span>
                              </div>
                            </td>
                            <td>{projName}</td>
                            <td>{task.assignedTo?.name || "Unassigned"}</td>
                            <td>
                              <span className={`reports-badge reports-priority-${task.priority?.toLowerCase()}`}>
                                {task.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`reports-badge reports-status-${task.status?.toLowerCase().replace(" ", "-")}`}>
                                {task.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                            </td>
                            <td>{getTaskHours(task)}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Team Reports Tab */}
            {activeTab === "team" && (
              <div className="reports-teams-tab-grid">
                {teams.map((team, idx) => {
                  const memberIds = (team.members || []).map((m) => m._id || m);
                  if (team.manager) {
                    memberIds.push(team.manager._id || team.manager);
                  }
                  const teamTasks = filteredTasks.filter((t) => t.assignedTo && memberIds.includes(t.assignedTo._id || t.assignedTo));
                  const comp = teamTasks.filter((t) => t.status === "Completed").length;
                  const total = teamTasks.length;
                  const rate = total > 0 ? Math.round((comp / total) * 100) : 0;
                  const projIds = new Set(teamTasks.map((t) => t.project?._id || t.project));

                  return (
                    <div className="reports-team-report-card" key={team._id}>
                      <div className="reports-team-report-header">
                        <h3>{team.name}</h3>
                        <span className="reports-team-performance-badge" style={{ color: rate > 75 ? "#10b981" : rate > 45 ? "#f59e0b" : "#ef4444" }}>
                          {rate}% Performance
                        </span>
                      </div>
                      <p className="reports-team-description">{team.description || "No description provided."}</p>
                      
                      <div className="reports-team-meta-row">
                        <div className="meta-item">
                          <span className="meta-label">Manager</span>
                          <span className="meta-value">{team.manager?.name || "N/A"}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Members</span>
                          <span className="meta-value">{team.members?.length || 0} users</span>
                        </div>
                      </div>

                      <div className="reports-team-metrics-row">
                        <div className="metric-box">
                          <span>Projects Associated</span>
                          <strong>{projIds.size}</strong>
                        </div>
                        <div className="metric-box">
                          <span>Task Progress</span>
                          <strong>{comp} / {total} Completed</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* User Reports Tab */}
            {activeTab === "user" && (
              <div className="reports-chart-card">
                <div className="reports-chart-header">
                  <h3>User Workload & Activity Overview</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Assigned Tasks</th>
                        <th>Completed</th>
                        <th>Pending / Active</th>
                        <th>Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const userTasks = filteredTasks.filter(
                          (t) => t.assignedTo && (t.assignedTo._id === user._id || t.assignedTo === user._id)
                        );
                        const userCompleted = userTasks.filter((t) => t.status === "Completed").length;
                        const userPending = userTasks.filter((t) => t.status !== "Completed").length;
                        const userOverdue = userTasks.filter(
                          (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed"
                        ).length;

                        return (
                          <tr key={user._id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div className="user-avatar-initials">
                                  {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                                </div>
                                <span style={{ fontWeight: "600" }}>{user.name}</span>
                              </div>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`reports-badge reports-role-${user.role?.toLowerCase()}`}>
                                {user.role || "Member"}
                              </span>
                            </td>
                            <td>
                              <span className={`status-indicator ${user.isActive ? "active" : "inactive"}`}>
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ fontWeight: "600" }}>{userTasks.length}</td>
                            <td style={{ color: "#10b981" }}>{userCompleted}</td>
                            <td style={{ color: "#3b82f6" }}>{userPending}</td>
                            <td style={{ color: userOverdue > 0 ? "#ef4444" : "rgba(255,255,255,0.4)" }}>
                              {userOverdue}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Custom Reports Tab */}
            {activeTab === "custom" && (
              <div className="reports-chart-card">
                <div className="reports-chart-header">
                  <h3>Custom Query Report Builder</h3>
                </div>
                
                <div className="reports-custom-controls">
                  <div className="filter-group">
                    <label>Query Type</label>
                    <select
                      value={customReportType}
                      onChange={(e) => setCustomReportType(e.target.value)}
                    >
                      <option value="projects">Projects List</option>
                      <option value="tasks">Tasks List</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Sort By</label>
                    <select
                      value={customSortBy}
                      onChange={(e) => setCustomSortBy(e.target.value)}
                    >
                      <option value="createdAt">Date Created</option>
                      <option value="name">Name / Title</option>
                      <option value="priority">Priority</option>
                      {customReportType === "projects" && <option value="progress">Progress %</option>}
                      {customReportType === "tasks" && <option value="dueDate">Due Date</option>}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "20px", overflowX: "auto" }}>
                  {customReportType === "projects" ? (
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredProjects]
                          .sort((a, b) => {
                            if (customSortBy === "name") return (a.name || "").localeCompare(b.name || "");
                            if (customSortBy === "progress") return (b.progress || 0) - (a.progress || 0);
                            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                          })
                          .map((proj) => (
                            <tr key={proj._id}>
                              <td style={{ fontWeight: "600" }}>{proj.name}</td>
                              <td>{proj.priority}</td>
                              <td>{proj.status}</td>
                              <td>{proj.progress || 0}%</td>
                              <td>{proj.owner?.name || "N/A"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Project</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assignee</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredTasks]
                          .sort((a, b) => {
                            if (customSortBy === "name") return (a.title || "").localeCompare(b.title || "");
                            if (customSortBy === "dueDate") return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
                            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                          })
                          .map((task) => (
                            <tr key={task._id}>
                              <td style={{ fontWeight: "600" }}>{task.title}</td>
                              <td>{task.project?.name || "General"}</td>
                              <td>{task.priority}</td>
                              <td>{task.status}</td>
                              <td>{task.assignedTo?.name || "Unassigned"}</td>
                              <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Reports;
import { useState, useEffect, useMemo } from "react";
import MainLayout from "../../layouts/MainLayout";
import StatsCard from "../../components/Dashboard/StatsCard";
import CreateProjectModal from "../../components/Projects/CreateProjectModal";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  FaFolderOpen,
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClipboardList,
  FaCalendarAlt,
  FaChevronDown,
  FaRegCheckCircle,
  FaArrowRight,
  FaShoppingBag,
  FaMobileAlt,
  FaDesktop,
  FaVolumeUp,
  FaUser,
  FaComment,
  FaUpload,
  FaPlus,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { createProject } from "../../services/projectService";
import "../../styles/dashboard.css";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-3d-tooltip">
        {label && <p className="tooltip-label">{label}</p>}
        <div className="tooltip-values">
          {payload.map((p, idx) => {
            const valColor = p.color || p.payload?.color || "#8b5cf6";
            return (
              <div key={idx} className="tooltip-value-row">
                <span className="tooltip-dot" style={{ background: valColor }}></span>
                <span className="tooltip-name">{p.name || "Value"}:</span>
                <span className="tooltip-val" style={{ color: valColor }}>{p.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const LiveDateTime = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }) + " • " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  return <span>{formatDateTime(currentDate)}</span>;
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [showCreateModal, setShowCreate] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState("All");

  const [realProjects, setRealProjects] = useState([]);
  const [realTasks, setRealTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      try {
        const projectsData = await getProjects();
        setRealProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (err) {
        console.error("Failed to load projects:", err);
      }

      try {
        const tasksData = await getTasks();
        setRealTasks(Array.isArray(tasksData) ? tasksData : []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }
      
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateProject = async (formData) => {
    try {
      await createProject(formData);
      setShowCreate(false);
      loadDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create project");
    }
  };

  // Sparkline data linked to real counts
  const statsChartData = useMemo(() => {
    return {
      projects: [0, 0, 0, 0, 0, 0, realProjects.length],
      tasks: [0, 0, 0, 0, 0, 0, realTasks.length],
      completed: [0, 0, 0, 0, 0, 0, realTasks.filter(t => t.status?.toLowerCase() === "completed").length],
      pending: [0, 0, 0, 0, 0, 0, realTasks.filter(t => t.status?.toLowerCase() !== "completed").length],
      members: [0, 0, 0, 0, 0, 0, new Set(realTasks.map(t => t.assignedTo?._id || t.assignedTo).filter(Boolean)).size || 1],
      overdue: [0, 0, 0, 0, 0, 0, realTasks.filter(t => t.status?.toLowerCase() !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length],
    };
  }, [realProjects, realTasks]);

  // Donut chart data (Project Status Overview)
  const getProjectStatusCount = (statusName) => {
    return realProjects.filter(p => p.status?.toLowerCase().replace("_", " ") === statusName.toLowerCase()).length;
  };

  const donutData = useMemo(() => {
    return [
      { name: "Planning", value: getProjectStatusCount("Planning"), color: "#3b82f6" },
      { name: "In Progress", value: getProjectStatusCount("In Progress"), color: "#10b981" },
      { name: "On Hold", value: getProjectStatusCount("On Hold"), color: "#f59e0b" },
      { name: "Completed", value: getProjectStatusCount("Completed"), color: "#ec4899" },
      { name: "Cancelled", value: getProjectStatusCount("Cancelled"), color: "#ef4444" },
    ];
  }, [realProjects]);

  // Tasks overview line chart data (Weekly)
  const lineChartData = useMemo(() => {
    const data = [
      { name: "Mon", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Tue", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Wed", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Thu", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Fri", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Sat", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
      { name: "Sun", Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 },
    ];
    if (realTasks.length > 0) {
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      realTasks.forEach(task => {
        const date = task.createdAt ? new Date(task.createdAt) : new Date();
        const dayName = daysOfWeek[date.getDay()];
        const dayObj = data.find(d => d.name === dayName);
        if (dayObj) {
          const status = task.status ? task.status.toLowerCase() : "pending";
          if (status === "completed") {
            dayObj.Completed += 1;
          } else if (status === "in progress" || status === "in_progress") {
            dayObj["In Progress"] += 1;
          } else {
            dayObj.Pending += 1;
          }
          if (status !== "completed" && task.dueDate && new Date(task.dueDate) < new Date()) {
            dayObj.Overdue += 1;
          }
        }
      });
    }
    return data;
  }, [realTasks]);

  // "My Tasks" data
  const myTasksData = useMemo(() => {
    return realTasks.map(task => ({
      id: task._id,
      title: task.title,
      project: task.project?.name || "General Task",
      due: task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date",
      priority: task.priority || "Medium",
      statusColor: task.priority === "High" ? "#f43f5e" : task.priority === "Medium" ? "#f59e0b" : "#3b82f6",
      tab: task.assignedTo === user?._id || task.assignedTo?._id === user?._id ? "Assigned" : "Created"
    }));
  }, [realTasks, user?._id]);

  // Filter tasks based on selected tab
  const filteredTasks = myTasksData.filter((task) => {
    if (activeTaskTab === "All") return true;
    if (activeTaskTab === "Assigned to Me") return task.tab === "Assigned";
    if (activeTaskTab === "Created by Me") return task.tab === "Created";
    return true;
  });

  // Recent Projects mapping
  const recentProjectsData = realProjects.slice(0, 4).map(proj => ({
    id: proj._id,
    name: proj.name,
    status: proj.status || "In Progress",
    progress: proj.progress !== undefined ? proj.progress : 50,
    color: proj.status === "Completed" ? "#10b981" : proj.status === "On Hold" ? "#f59e0b" : "#3b82f6",
    icon: <FaFolderOpen />
  }));

  // Combine tasks and projects creations to make a dynamic team activity feed
  const combinedActivities = [];

  realTasks.forEach(task => {
    combinedActivities.push({
      id: task._id + "-task",
      user: task.createdBy?.name || "Someone",
      initials: task.createdBy?.name ? task.createdBy.name.split(" ").map(w => w[0]).join("").toUpperCase() : "U",
      bgColor: "#8b5cf6",
      action: `created task "${task.title}"`,
      time: task.createdAt ? new Date(task.createdAt) : new Date(),
      iconType: "task"
    });
  });

  realProjects.forEach(proj => {
    combinedActivities.push({
      id: proj._id + "-proj",
      user: proj.owner?.name || "Someone",
      initials: proj.owner?.name ? proj.owner.name.split(" ").map(w => w[0]).join("").toUpperCase() : "U",
      bgColor: "#10b981",
      action: `created project "${proj.name}"`,
      time: proj.createdAt ? new Date(proj.createdAt) : new Date(),
      iconType: "project"
    });
  });

  const activityData = combinedActivities
    .sort((a, b) => b.time - a.time)
    .slice(0, 4)
    .map(act => {
      const diffMs = new Date() - act.time;
      const diffMins = Math.floor(diffMs / 60000);
      let timeText = "Just now";
      if (diffMins > 0 && diffMins < 60) timeText = `${diffMins}m ago`;
      else if (diffMins >= 60 && diffMins < 1440) timeText = `${Math.floor(diffMins / 60)}h ago`;
      else if (diffMins >= 1440) timeText = `${Math.floor(diffMins / 1440)}d ago`;

      return {
        id: act.id,
        user: act.user,
        initials: act.initials.substring(0, 2),
        bgColor: act.bgColor,
        action: act.action,
        time: timeText,
        icon: act.iconType === "task" ? <FaCheckCircle style={{ color: "#8b5cf6" }} /> : <FaFolderOpen style={{ color: "#10b981" }} />,
        badgeBg: act.iconType === "task" ? "rgba(139, 92, 246, 0.1)" : "rgba(16, 185, 129, 0.1)"
      };
    });

  // Upcoming Deadlines mapped dynamically from realTasks
  const deadlinesData = realTasks
    .filter(t => t.status?.toLowerCase() !== "completed" && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4)
    .map(t => {
      const date = new Date(t.dueDate);
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const diffMs = date - new Date();
      const daysDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      let dueText = `In ${daysDiff} days`;
      if (daysDiff === 0) dueText = "Due Today";
      else if (daysDiff === 1) dueText = "Due Tomorrow";
      else if (daysDiff < 0) dueText = `${Math.abs(daysDiff)} days overdue`;

      return {
        id: t._id,
        month: months[date.getMonth()],
        day: String(date.getDate()),
        title: t.title,
        project: t.project?.name || "General Task",
        priority: t.priority || "Medium",
        dueText
      };
    });

  const displayProjects = realProjects.length;
  const displayTasks = realTasks.length;
  const displayCompleted = realTasks.filter(t => t.status?.toLowerCase() === "completed").length;
  const displayPending = realTasks.filter(t => t.status?.toLowerCase() !== "completed").length;
  const displayMembers = new Set(realTasks.map(t => t.assignedTo?._id || t.assignedTo).filter(Boolean)).size || 1;
  const displayOverdue = realTasks.filter(t => t.status?.toLowerCase() !== "completed" && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const assignedTasks = realTasks.filter((task) => String(task.assignedTo?._id || task.assignedTo || "") === String(user?._id));
  const createdTasks = realTasks.filter((task) => String(task.createdBy?._id || task.createdBy || "") === String(user?._id));
  const assignedProjects = realProjects.filter((project) => {
    const isOwner = String(project.owner?._id || project.owner || "") === String(user?._id);
    const isMember = (project.members || []).some((member) => String(member.user?._id || member.user || "") === String(user?._id));
    return isOwner || isMember;
  });
  const todaysTasks = assignedTasks.filter((task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate).toDateString() === new Date().toDateString();
  }).length;
  const upcomingDeadlines = assignedTasks.filter((task) => {
    if (!task.dueDate || task.status?.toLowerCase() === "completed") return false;
    return new Date(task.dueDate) >= new Date();
  }).length;
  const myCompletedTasks = assignedTasks.filter((task) => task.status?.toLowerCase() === "completed").length;
  const myPendingTasks = assignedTasks.filter((task) => task.status?.toLowerCase() !== "completed").length;
  const roleDashboardCards = isAdmin
    ? [
        { title: "Total Projects", value: displayProjects, icon: <FaFolderOpen />, trend: "12%", trendDir: "up", color: "#8b5cf6", chartData: statsChartData.projects },
        { title: "Total Tasks", value: displayTasks, icon: <FaClipboardList />, trend: "8%", trendDir: "up", color: "#f59e0b", chartData: statsChartData.tasks },
        { title: "Completed Tasks", value: displayCompleted, icon: <FaCheckCircle />, trend: "16%", trendDir: "up", color: "#10b981", chartData: statsChartData.completed },
        { title: "Pending Tasks", value: displayPending, icon: <FaClock />, trend: "6%", trendDir: "down", color: "#ec4899", chartData: statsChartData.pending },
        { title: "Team Members", value: displayMembers, icon: <FaUsers />, trend: "5%", trendDir: "up", color: "#3b82f6", chartData: statsChartData.members },
        { title: "Project Status", value: `${displayProjects}`, icon: <FaFolderOpen />, trend: "Live", trendDir: "up", color: "#14b8a6", chartData: statsChartData.projects },
      ]
    : user?.role === "project_manager"
      ? [
          { title: "Assigned Projects", value: assignedProjects.length, icon: <FaFolderOpen />, trend: "Active", trendDir: "up", color: "#8b5cf6", chartData: statsChartData.projects },
          { title: "Today's Tasks", value: todaysTasks, icon: <FaCalendarAlt />, trend: "Today", trendDir: "up", color: "#3b82f6", chartData: statsChartData.tasks },
          { title: "Pending Tasks", value: myPendingTasks, icon: <FaClock />, trend: "Open", trendDir: "down", color: "#f59e0b", chartData: statsChartData.pending },
          { title: "Overdue Tasks", value: displayOverdue, icon: <FaExclamationTriangle />, trend: "Attention", trendDir: "down", color: "#ef4444", chartData: statsChartData.overdue },
        ]
      : [
          { title: "Assigned Tasks", value: assignedTasks.length, icon: <FaClipboardList />, trend: "Assigned", trendDir: "up", color: "#8b5cf6", chartData: statsChartData.tasks },
          { title: "Upcoming Deadlines", value: upcomingDeadlines, icon: <FaCalendarAlt />, trend: "Planned", trendDir: "up", color: "#3b82f6", chartData: statsChartData.pending },
          { title: "Completed Tasks", value: myCompletedTasks, icon: <FaCheckCircle />, trend: "Done", trendDir: "up", color: "#10b981", chartData: statsChartData.completed },
        ];

  return (
    <MainLayout>
      <div className="dashboard-wrapper">
        {/* Dashboard Title & Date Selector */}
        <div className="dashboard-top-bar">
          <div className="dashboard-welcome">
            <h1>Dashboard 👋</h1>
            <p>Welcome back, {user?.name || "John"}! Here's what's happening with your projects today.</p>
          </div>
          <div className="dashboard-top-actions">
            {isAdmin && (
              <button className="dashboard-create-btn" onClick={() => setShowCreate(true)}>
                <FaPlus /> Create Project
              </button>
            )}
            <div className="dashboard-date-selector">
              <FaCalendarAlt className="cal-icon" />
              <LiveDateTime />
              <FaChevronDown className="chevron" />
            </div>
          </div>
        </div>

        {/* Row of 6 Stats Cards */}
        <div className="dashboard-stats-grid">
          {roleDashboardCards.map((card) => (
            <StatsCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              trendDir={card.trendDir}
              color={card.color}
              chartData={card.chartData}
            />
          ))}
        </div>

        {/* Middle Section: Donut Chart, Line Chart, My Tasks */}
        <div className="dashboard-middle-grid">
          {/* Project Status Overview (Donut Chart) */}
          <div className="dash-card project-status-card">
            <div className="dash-card-header">
              <h3>Project Status Overview</h3>
            </div>
            <div className="donut-chart-container">
              {displayProjects === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", padding: "40px 20px", textAlign: "center", width: "100%" }}>
                  No projects available. Create a project to view the status overview.
                </div>
              ) : (
                <>
                  <div className="donut-chart-wrapper">
                    <PieChart width={160} height={160}>
                      <Pie
                        data={donutData}
                        cx={80}
                        cy={80}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                    {/* Center Label */}
                    <div className="donut-center-label">
                      <h4>{displayProjects}</h4>
                      <span>Projects</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="donut-legend">
                    {donutData.map((item, idx) => (
                      <div className="legend-item" key={idx}>
                        <div className="legend-label-left">
                          <span className="legend-dot" style={{ background: item.color }}></span>
                          <span>{item.name}</span>
                        </div>
                        <span className="legend-val">{item.value} ({displayProjects > 0 ? Math.round((item.value / displayProjects) * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="dash-card-footer-action">
              <a href="/projects">View All Projects <FaArrowRight /></a>
            </div>
          </div>

          {/* Tasks Overview (Line Chart) */}
          <div className="dash-card tasks-overview-card">
            <div className="dash-card-header">
              <h3>Tasks Overview</h3>
              <div className="card-header-filter">
                <span>This Week</span>
                <FaChevronDown />
              </div>
            </div>
            <div className="tasks-chart-container">
              {/* Legend row */}
              <div className="tasks-chart-legend">
                <span className="leg-item"><span className="dot green"></span>Completed</span>
                <span className="leg-item"><span className="dot blue"></span>In Progress</span>
                <span className="leg-item"><span className="dot orange"></span>Pending</span>
                <span className="leg-item"><span className="dot red"></span>Overdue</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="In Progress" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Pending" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* My Tasks List */}
          <div className="dash-card my-tasks-card">
            <div className="dash-card-header">
              <h3>My Tasks</h3>
              <a href="/tasks" className="header-link">View All <FaArrowRight /></a>
            </div>
            {/* Filter Tabs */}
            <div className="my-tasks-tabs">
              {["All", "Assigned to Me", "Created by Me"].map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTaskTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTaskTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Tasks list scrollable */}
            <div className="my-tasks-list">
              {filteredTasks.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", padding: "40px 20px", textAlign: "center" }}>
                  No tasks assigned or created.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div className="my-task-item" key={task.id}>
                    <div className="my-task-left">
                      <span className="task-status-dot" style={{ background: task.statusColor }}></span>
                      <div className="task-meta">
                        <h4>{task.title}</h4>
                        <p>{task.project}</p>
                      </div>
                    </div>
                    <div className="my-task-right">
                      <span className="task-due-date">{task.due}</span>
                      <span className={`task-priority-badge priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Projects, Team Activity, Upcoming Deadlines */}
        <div className="dashboard-bottom-grid">
          {/* Recent Projects Progress Panel */}
          <div className="dash-card recent-projects-card">
            <div className="dash-card-header">
              <h3>Recent Projects</h3>
              <a href="/projects" className="header-link">View All <FaArrowRight /></a>
            </div>
            <div className="recent-projects-list">
              {recentProjectsData.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", padding: "40px 20px", textAlign: "center" }}>
                  No recent projects found.
                </div>
              ) : (
                recentProjectsData.map((project) => (
                  <div className="recent-proj-item" key={project.id}>
                    <div className="recent-proj-meta">
                      <div className="proj-icon" style={{ background: `${project.color}15`, color: project.color }}>
                        {project.icon}
                      </div>
                      <div className="proj-info">
                        <h4>{project.name}</h4>
                        <span><span className="proj-dot" style={{ background: project.color }}></span>{project.status}</span>
                      </div>
                    </div>
                    <div className="recent-proj-progress">
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${project.progress}%`, background: project.color }}></div>
                      </div>
                      <span className="progress-percent">{project.progress}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Activity Feed */}
          <div className="dash-card team-activity-card">
            <div className="dash-card-header">
              <h3>Team Activity</h3>
              <a href={isAdmin ? "/teams" : "/projects"} className="header-link">View All <FaArrowRight /></a>
            </div>
            <div className="activity-feed-list">
              {activityData.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", padding: "40px 20px", textAlign: "center" }}>
                  No recent activities found.
                </div>
              ) : (
                activityData.map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <div className="activity-user-box">
                      <div className="activity-avatar" style={{ background: activity.bgColor }}>
                        {activity.initials}
                      </div>
                      <div className="activity-details">
                        <p><strong>{activity.user}</strong> {activity.action}</p>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                    <div className="activity-badge" style={{ background: activity.badgeBg }}>
                      {activity.icon}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines (Date cards) */}
          <div className="dash-card upcoming-deadlines-card">
            <div className="dash-card-header">
              <h3>Upcoming Deadlines</h3>
              <a href="/calendar" className="header-link">View Calendar <FaArrowRight /></a>
            </div>
            <div className="deadlines-list-box">
              {deadlinesData.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", padding: "40px 20px", textAlign: "center" }}>
                  No upcoming deadlines found.
                </div>
              ) : (
                deadlinesData.map((deadline) => (
                  <div className="deadline-item-row" key={deadline.id}>
                    <div className="deadline-date-card">
                      <span className="date-month">{deadline.month}</span>
                      <span className="date-day">{deadline.day}</span>
                    </div>
                    <div className="deadline-meta-info">
                      <h4>{deadline.title}</h4>
                      <p>{deadline.project}</p>
                    </div>
                    <div className="deadline-badge-block">
                      <span className={`priority-pill priority-${deadline.priority.toLowerCase()}`}>
                        {deadline.priority}
                      </span>
                      <span className="due-days-text">{deadline.dueText}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateProject}
      />
    </MainLayout>
  );
};

export default Dashboard;

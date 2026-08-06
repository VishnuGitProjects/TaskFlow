import { useEffect, useMemo, useState } from "react";
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
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaFolderOpen,
  FaPlus,
  FaUsers,
} from "react-icons/fa";
import MainLayout from "../../layouts/MainLayout";
import StatsCard from "../../components/Dashboard/StatsCard";
import CreateProjectModal from "../../components/Projects/CreateProjectModal";
import { useAuth } from "../../context/AuthContext";
import { createProject, getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getTeams } from "../../services/teamService";
import { getUsers } from "../../services/userService";
import "../../styles/dashboard.css";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="custom-3d-tooltip">
      {label && <p className="tooltip-label">{label}</p>}
      <div className="tooltip-values">
        {payload.map((entry, index) => {
          const entryColor = entry.color || entry.payload?.color || "#3b82f6";
          return (
            <div key={`${entry.name}-${index}`} className="tooltip-value-row">
              <span className="tooltip-dot" style={{ background: entryColor }}></span>
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-val" style={{ color: entryColor }}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LiveDateTime = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span>
      {currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })}{" "}
      |{" "}
      {currentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })}
    </span>
  );
};

const formatDueDate = (dueDate) => {
  if (!dueDate) {
    return "No due date";
  }

  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getDueText = (task) => {
  if (!task?.dueDate) {
    return "No due date";
  }

  if (task.status === "Completed") {
    return "Completed";
  }

  const dueDate = new Date(task.dueDate);
  const today = new Date();
  const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return "Due Today";
  if (daysDiff === 1) return "Due Tomorrow";
  if (daysDiff < 0) return `${Math.abs(daysDiff)} days overdue`;
  return `${daysDiff} days left`;
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState("All");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [projectsResult, tasksResult, teamsResult, usersResult] = await Promise.allSettled([
        getProjects(),
        getTasks(),
        isAdmin ? getTeams() : Promise.resolve([]),
        isAdmin ? getUsers() : Promise.resolve([]),
      ]);

      setProjects(projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value) ? projectsResult.value : []);
      setTasks(tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : []);
      setTeams(teamsResult.status === "fulfilled" && Array.isArray(teamsResult.value) ? teamsResult.value : []);
      setUsers(usersResult.status === "fulfilled" && Array.isArray(usersResult.value) ? usersResult.value : []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setProjects([]);
      setTasks([]);
      setTeams([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAdmin]);

  const handleCreateProject = async (formData) => {
    try {
      await createProject(formData);
      setShowCreateModal(false);
      await loadDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create project");
    }
  };

  const assignedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => String(task.assignedTo?._id || task.assignedTo || "") === currentUserId
      ),
    [currentUserId, tasks]
  );

  const assignedProjects = useMemo(
    () =>
      projects.filter((project) => {
        const isOwner = String(project.owner?._id || project.owner || "") === currentUserId;
        const isMember = (project.members || []).some(
          (member) => String(member.user?._id || member.user || "") === currentUserId
        );
        return isOwner || isMember;
      }),
    [currentUserId, projects]
  );

  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "Completed").length;
  const overdueTasks = tasks.filter(
    (task) => task.status !== "Completed" && task.dueDate && new Date(task.dueDate) < new Date()
  ).length;
  const teamMembersCount = users.filter((entry) => entry.role !== "admin").length;
  const managedProjectIds = assignedProjects.map((project) => String(project._id));
  const managedProjectTasks = tasks.filter((task) =>
    managedProjectIds.includes(String(task.project?._id || task.project || ""))
  );
  const todaysTasks = managedProjectTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()
  ).length;
  const assignedPendingTasks = managedProjectTasks.filter((task) => task.status !== "Completed").length;
  const assignedOverdueTasks = managedProjectTasks.filter(
    (task) => task.status !== "Completed" && task.dueDate && new Date(task.dueDate) < new Date()
  ).length;
  const upcomingDeadlinesCount = assignedTasks.filter(
    (task) => task.status !== "Completed" && task.dueDate && new Date(task.dueDate) >= new Date()
  ).length;
  const assignedCompletedTasks = assignedTasks.filter((task) => task.status === "Completed").length;

  const pendingChartCount = user?.role === "project_manager" ? assignedPendingTasks : pendingTasks;
  const overdueChartCount = user?.role === "project_manager" ? assignedOverdueTasks : overdueTasks;
  const sparklineData = useMemo(
    () => ({
      projects: [0, 0, 0, 0, 0, 0, totalProjects],
      tasks: [0, 0, 0, 0, 0, 0, totalTasks],
      completed: [0, 0, 0, 0, 0, 0, completedTasks],
      pending: [0, 0, 0, 0, 0, 0, pendingChartCount],
      members: [0, 0, 0, 0, 0, 0, teamMembersCount],
      overdue: [0, 0, 0, 0, 0, 0, overdueChartCount],
      today: [0, 0, 0, 0, 0, 0, todaysTasks],
      assigned: [0, 0, 0, 0, 0, 0, assignedTasks.length],
      upcoming: [0, 0, 0, 0, 0, 0, upcomingDeadlinesCount],
    }),
    [
      assignedTasks.length,
      completedTasks,
      overdueChartCount,
      pendingChartCount,
      teamMembersCount,
      todaysTasks,
      totalProjects,
      totalTasks,
      upcomingDeadlinesCount,
    ]
  );

  const donutData = useMemo(
    () => [
      { name: "Planning", value: projects.filter((project) => project.status === "Planning").length, color: "#3b82f6" },
      { name: "In Progress", value: projects.filter((project) => project.status === "In Progress").length, color: "#10b981" },
      { name: "On Hold", value: projects.filter((project) => project.status === "On Hold").length, color: "#f59e0b" },
      { name: "Completed", value: projects.filter((project) => project.status === "Completed").length, color: "#ec4899" },
      { name: "Cancelled", value: projects.filter((project) => project.status === "Cancelled").length, color: "#ef4444" },
    ],
    [projects]
  );

  const lineChartData = useMemo(() => {
    const taskSource =
      user?.role === "project_manager" ? managedProjectTasks : tasks;

    const baseDays = [
      { name: "Mon", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Tue", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Wed", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Thu", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Fri", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Sat", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
      { name: "Sun", Completed: 0, "In Progress": 0, Review: 0, "To Do": 0 },
    ];

    const labelByDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    taskSource.forEach((task) => {
      const taskDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt || Date.now());
      const dayLabel = labelByDay[taskDate.getDay()];
      const row = baseDays.find((entry) => entry.name === dayLabel);
      if (!row) return;

      if (task.status === "Completed") row.Completed += 1;
      else if (task.status === "In Progress") row["In Progress"] += 1;
      else if (task.status === "Review") row.Review += 1;
      else row["To Do"] += 1;
    });

    return baseDays;
  }, [managedProjectTasks, tasks, user?.role]);

  const visibleTaskList = useMemo(() => {
    const sourceTasks = isAdmin ? tasks : assignedTasks;

    return sourceTasks.map((task) => ({
      id: task._id,
      title: task.title,
      project: task.project?.name || "General Task",
      due: formatDueDate(task.dueDate),
      dueText: getDueText(task),
      priority: task.priority || "Medium",
      status: task.status || "To Do",
    }));
  }, [assignedTasks, isAdmin, tasks]);

  const filteredTasks = visibleTaskList.filter((task) => {
    if (activeTaskTab === "Completed") return task.status === "Completed";
    if (activeTaskTab === "Pending") return task.status !== "Completed";
    return true;
  });

  const upcomingDeadlines = useMemo(
    () =>
      assignedTasks
        .filter((task) => task.status !== "Completed" && task.dueDate)
        .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
        .slice(0, 5)
        .map((task) => {
          const date = new Date(task.dueDate);
          return {
            id: task._id,
            month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
            day: `${date.getDate()}`,
            title: task.title,
            project: task.project?.name || "General Task",
            priority: task.priority || "Medium",
            dueText: getDueText(task),
          };
        }),
    [assignedTasks]
  );

  const roleDashboardCards = isAdmin
    ? [
        { title: "Total Projects", value: totalProjects, icon: <FaFolderOpen />, color: "#8b5cf6", chartData: sparklineData.projects },
        { title: "Total Tasks", value: totalTasks, icon: <FaClipboardList />, color: "#f59e0b", chartData: sparklineData.tasks },
        { title: "Completed Tasks", value: completedTasks, icon: <FaCheckCircle />, color: "#10b981", chartData: sparklineData.completed },
        { title: "Pending Tasks", value: pendingTasks, icon: <FaClock />, color: "#ec4899", chartData: sparklineData.pending },
        { title: "Team Members", value: teamMembersCount, icon: <FaUsers />, color: "#3b82f6", chartData: sparklineData.members },
        { title: "Project Status", value: totalProjects, icon: <FaFolderOpen />, color: "#14b8a6", chartData: sparklineData.projects },
      ]
    : user?.role === "project_manager"
      ? [
          { title: "Assigned Projects", value: assignedProjects.length, icon: <FaFolderOpen />, color: "#8b5cf6", chartData: sparklineData.projects },
          { title: "Today's Tasks", value: todaysTasks, icon: <FaCalendarAlt />, color: "#3b82f6", chartData: sparklineData.today },
          { title: "Pending Tasks", value: assignedPendingTasks, icon: <FaClock />, color: "#f59e0b", chartData: sparklineData.pending },
          { title: "Overdue Tasks", value: assignedOverdueTasks, icon: <FaExclamationTriangle />, color: "#ef4444", chartData: sparklineData.overdue },
        ]
      : [
          { title: "Assigned Tasks", value: assignedTasks.length, icon: <FaClipboardList />, color: "#8b5cf6", chartData: sparklineData.assigned },
          { title: "Upcoming Deadlines", value: upcomingDeadlinesCount, icon: <FaCalendarAlt />, color: "#3b82f6", chartData: sparklineData.upcoming },
          { title: "Completed Tasks", value: assignedCompletedTasks, icon: <FaCheckCircle />, color: "#10b981", chartData: sparklineData.completed },
        ];

  const contentGridClass = isAdmin
    ? "dashboard-content-grid cols-2"
    : user?.role === "project_manager"
      ? "dashboard-content-grid cols-3"
      : "dashboard-content-grid cols-2";

  return (
    <MainLayout>
      <div className="dashboard-wrapper">
        <div className="dashboard-top-bar">
          <div className="dashboard-welcome">
            <h1>Dashboard</h1>
            <p>
              Welcome back, {user?.name || "User"}! Here is the latest project and task summary for
              Thursday, August 6, 2026.
            </p>
          </div>
          <div className="dashboard-top-actions">
            {isAdmin && (
              <button className="dashboard-create-btn" onClick={() => setShowCreateModal(true)}>
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

        {loading ? (
          <div className="dashboard-loading-card">
            Loading dashboard tiles...
          </div>
        ) : (
          <>
            <div className="dashboard-stats-grid">
              {roleDashboardCards.map((card) => (
                <StatsCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  color={card.color}
                  chartData={card.chartData}
                />
              ))}
            </div>

            <div className={contentGridClass}>
              {isAdmin && (
                <>
                  <div className="dash-card project-status-card">
                    <div className="dash-card-header">
                      <h3>Project Status Overview</h3>
                    </div>
                    <div className="donut-chart-container">
                      {totalProjects === 0 ? (
                        <div className="dashboard-empty-state">
                          No projects available yet.
                        </div>
                      ) : (
                        <>
                          <div className="donut-chart-wrapper">
                            <PieChart width={180} height={180}>
                              <Pie
                                data={donutData}
                                cx={90}
                                cy={90}
                                innerRadius={58}
                                outerRadius={78}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {donutData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                            <div className="donut-center-label">
                              <h4>{totalProjects}</h4>
                              <span>Projects</span>
                            </div>
                          </div>
                          <div className="donut-legend">
                            {donutData.map((entry) => (
                              <div className="legend-item" key={entry.name}>
                                <div className="legend-label-left">
                                  <span className="legend-dot" style={{ background: entry.color }}></span>
                                  <span>{entry.name}</span>
                                </div>
                                <span className="legend-val">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="dash-card-footer-action">
                      <a href="/projects">
                        View Projects <FaArrowRight />
                      </a>
                    </div>
                  </div>

                  <div className="dash-card tasks-overview-card">
                    <div className="dash-card-header">
                      <h3>Tasks Overview</h3>
                    </div>
                    <div className="tasks-chart-container">
                      <div className="tasks-chart-legend">
                        <span className="leg-item"><span className="dot green"></span>Completed</span>
                        <span className="leg-item"><span className="dot blue"></span>In Progress</span>
                        <span className="leg-item"><span className="dot orange"></span>Review</span>
                        <span className="leg-item"><span className="dot red"></span>To Do</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="In Progress" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Review" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="To Do" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {!isAdmin && (
                <div className="dash-card my-tasks-card">
                  <div className="dash-card-header">
                    <h3>My Tasks</h3>
                    <a href="/tasks" className="header-link">
                      View All <FaArrowRight />
                    </a>
                  </div>
                  <div className="my-tasks-tabs">
                    {["All", "Pending", "Completed"].map((tab) => (
                      <button
                        key={tab}
                        className={`tab-btn ${activeTaskTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTaskTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="my-tasks-list">
                    {filteredTasks.length === 0 ? (
                      <div className="dashboard-empty-state">
                        No tasks available.
                      </div>
                    ) : (
                      filteredTasks.slice(0, 6).map((task) => (
                        <div className="my-task-item" key={task.id}>
                          <div className="my-task-left">
                            <span
                              className="task-status-dot"
                              style={{
                                background:
                                  task.status === "Completed"
                                    ? "#10b981"
                                    : task.status === "In Progress"
                                      ? "#3b82f6"
                                      : task.status === "Review"
                                        ? "#f59e0b"
                                        : "#ef4444",
                              }}
                            ></span>
                            <div className="task-meta">
                              <h4>{task.title}</h4>
                              <p>{task.project}</p>
                            </div>
                          </div>
                          <div className="my-task-right">
                            <span className={`dashboard-task-status status-${task.status.toLowerCase().replace(" ", "-")}`}>
                              {task.status}
                            </span>
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
              )}

              {user?.role === "project_manager" && (
                <div className="dash-card tasks-overview-card">
                  <div className="dash-card-header">
                    <h3>Tasks Overview</h3>
                  </div>
                  <div className="tasks-chart-container">
                    <div className="tasks-chart-legend">
                      <span className="leg-item"><span className="dot green"></span>Completed</span>
                      <span className="leg-item"><span className="dot blue"></span>In Progress</span>
                      <span className="leg-item"><span className="dot orange"></span>Review</span>
                      <span className="leg-item"><span className="dot red"></span>To Do</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="In Progress" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Review" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="To Do" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="dash-card upcoming-deadlines-card">
                  <div className="dash-card-header">
                    <h3>Upcoming Deadlines</h3>
                    <a href="/tasks" className="header-link">
                      View Tasks <FaArrowRight />
                    </a>
                  </div>
                  <div className="deadlines-list-box">
                    {upcomingDeadlines.length === 0 ? (
                      <div className="dashboard-empty-state">
                        No upcoming deadlines found.
                      </div>
                    ) : (
                      upcomingDeadlines.map((deadline) => (
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
              )}
            </div>
          </>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
        users={users}
        teams={teams}
      />
    </MainLayout>
  );
};

export default Dashboard;

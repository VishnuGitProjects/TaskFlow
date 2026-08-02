import { useState, useEffect } from "react";
import { FaBell, FaSearch, FaBars, FaChevronDown, FaSignOutAlt, FaRegCommentDots } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, markAsRead, markAllAsRead } from "../../services/notificationService";
import { getUnreadMessagesCount } from "../../services/messageService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";
import { getTeams } from "../../services/teamService";
import { SEARCHABLE_NAVIGATION } from "../../app/config/navigation";
import { hasRequiredRole, isAdminRole } from "../../app/config/roles";
import "../../styles/navbar.css";

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isUsersPage = location.pathname === "/users";

  // Global Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [allData, setAllData] = useState({ projects: [], tasks: [], users: [], teams: [] });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userProjects, setUserProjects] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const fetchUserProjects = async () => {
      try {
        const data = await getProjects();
        setUserProjects(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserProjects();
  }, [user]);

  const getDynamicRole = () => {
    if (user?.role === "admin") return "Admin";
    if (userProjects.length === 0) return "No projects yet";
    const ownsAny = userProjects.some(p => String(p.owner?._id || p.owner) === String(user?._id));
    return ownsAny ? "Project Owner" : "Team Member";
  };

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const data = await getUnreadMessagesCount();
        const count = data.totalUnread || 0;
        setUnreadMessagesCount(count);
        sessionStorage.setItem("unreadMessagesCount", count);
        window.dispatchEvent(new CustomEvent("unreadMessagesUpdate", { detail: count }));
      } catch (err) {
        console.error("Failed to fetch unread messages count:", err);
      }
    };

    fetchUnreadCount();

    const handleRefresh = () => {
      fetchUnreadCount();
    };

    window.addEventListener("refreshUnreadCount", handleRefresh);

    const interval = setInterval(fetchUnreadCount, 12000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refreshUnreadCount", handleRefresh);
    };
  }, [user]);
  // Load all entities in parallel when search gets focus
  const loadSearchData = async () => {
    if (dataLoaded) return;
    try {
      const [projects, tasks, users, teams] = await Promise.allSettled([
        getProjects(),
        getTasks(),
        getUsers(),
        getTeams(),
      ]);

      setAllData({
        projects: projects.status === "fulfilled" ? projects.value : [],
        tasks: tasks.status === "fulfilled" ? tasks.value : [],
        users: users.status === "fulfilled" ? users.value : [],
        teams: teams.status === "fulfilled" ? teams.value : [],
      });
      setDataLoaded(true);
    } catch (err) {
      console.error("Failed to load search data:", err);
    }
  };

  // Perform search filter when query or loaded data changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    // 1. Navigation matches
    const navMatches = SEARCHABLE_NAVIGATION
      .filter((route) => hasRequiredRole(user?.role, route.roles || []))
      .filter((route) => route.name.toLowerCase().includes(q))
      .map((route) => ({
        name: route.name,
        path: route.path,
        type: "Navigation",
        subtitle: `Go to ${route.name}`,
      }));

    // 2. Data matches
    const projectMatches = allData.projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({ name: p.name, path: `/tasks?projectId=${p._id}`, type: "Project", subtitle: p.description }));

    const taskMatches = allData.tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .map((t) => ({ name: t.title, path: `/tasks?projectId=${t.project?._id || t.project}`, type: "Task", subtitle: t.status }));

    const userMatches = isAdmin
      ? allData.users
          .filter((u) => u.name.toLowerCase().includes(q))
          .map((u) => ({ name: u.name, path: "/users", type: "User", subtitle: u.email }))
      : [];

    const teamMatches = isAdmin
      ? allData.teams
          .filter((t) => t.name.toLowerCase().includes(q))
          .map((t) => ({ name: t.name, path: "/teams", type: "Team", subtitle: `${t.members?.length || 0} members` }))
      : [];

    const combined = [...navMatches, ...projectMatches, ...taskMatches, ...userMatches, ...teamMatches];

    setSearchResults(combined.slice(0, 8)); // Limit to 8 items
  }, [searchQuery, allData, isAdmin, user?.role]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await handleMarkAsRead(n._id);
      }
      if (n.type === "new_message" && n.relatedId) {
        navigate(`/messages?projectId=${n.relatedId}`);
        setShowNotifications(false);
      }
    } catch (err) {
      console.error("Failed to process notification click:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (isUsersPage) {
      const event = new CustomEvent("globalSearch", { detail: val });
      window.dispatchEvent(event);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={onToggleSidebar}>
          <FaBars />
        </button>
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder={isUsersPage ? "Search users..." : isAdmin ? "Search projects, tasks, teams..." : "Search projects and tasks..."}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              loadSearchData();
              setShowSearchDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          />
          {showSearchDropdown && searchQuery.trim() && (
            <div className="search-dropdown">
              {searchResults.length === 0 ? (
                <div className="search-no-results">No results found</div>
              ) : (
                searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="search-result-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery("");
                      setShowSearchDropdown(false);
                      if (window.location.pathname === result.path.split("?")[0]) {
                        window.location.href = result.path;
                      } else {
                        navigate(result.path);
                      }
                    }}
                  >
                    <div className="search-result-header">
                      <span className="search-result-name">{result.name}</span>
                      <span className="search-result-type">{result.type}</span>
                    </div>
                    {result.subtitle && (
                      <span className="search-result-subtitle">{result.subtitle}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Notifications Icon with Badge */}
        <div className="nav-icon-container" onClick={() => setShowNotifications(!showNotifications)}>
          <FaBell className="nav-icon" />
          {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          
          {showNotifications && (
            <div className="notifications-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="notifications-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="mark-all-read-btn">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`notification-item ${n.isRead ? "read" : "unread"}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="notification-dot-container">
                        {!n.isRead && <span className="notification-unread-dot"></span>}
                      </div>
                      <div className="notification-content">
                        <span className="notification-title">{n.title}</span>
                        <p className="notification-message">{n.message}</p>
                        <span className="notification-time">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages Icon with Badge */}
        <div className="nav-icon-container" onClick={() => navigate("/messages")}>
          <FaRegCommentDots className="nav-icon" />
          {unreadMessagesCount > 0 && (
            <span className="nav-badge">
              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
            </span>
          )}
        </div>

        {/* Profile Dropdown Trigger */}
        <div className="profile" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="avatar-circle">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "JM"}
          </div>
          <div className="profile-info">
            <h4>{user?.name || "John Manager"}</h4>
            <span>{getDynamicRole()}</span>
          </div>
          <FaChevronDown className="profile-chevron" />

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="profile-dropdown">
              <div className="dropdown-item" onClick={logout}>
                <FaSignOutAlt />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

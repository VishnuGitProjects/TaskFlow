import { useState, useEffect } from "react";
import { FaBell, FaSearch, FaBars, FaChevronDown, FaSignOutAlt, FaRegCommentDots } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, markAsRead, markAllAsRead } from "../../services/notificationService";
import "../../styles/navbar.css";

// Format role for display
const formatRole = (role) => {
  if (!role) return "";
  if (role === "admin") return "Admin";
  if (role === "project_manager") return "Manager";
  if (role === "team_member") return "Team Member";
  return role;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const isUsersPage = location.pathname === "/users";

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
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
    if (isUsersPage) {
      const event = new CustomEvent("globalSearch", { detail: e.target.value });
      window.dispatchEvent(event);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn">
          <FaBars />
        </button>
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder={isUsersPage ? "Search users..." : "Search projects, tasks, teams..."}
            onChange={handleSearchChange}
          />
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
                      onClick={() => handleMarkAsRead(n._id)}
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
        <div className="nav-icon-container">
          <FaRegCommentDots className="nav-icon" />
          {/* Real message count is 0, hiding badge */}
        </div>

        {/* Profile Dropdown Trigger */}
        <div className="profile" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="avatar-circle">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "JM"}
          </div>
          <div className="profile-info">
            <h4>{user?.name || "John Manager"}</h4>
            <span>{formatRole(user?.role)}</span>
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
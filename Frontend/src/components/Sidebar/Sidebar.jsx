import { useState, useEffect } from "react";
import {
  FaHome,
  FaFolderOpen,
  FaTasks,
  FaUsers,
  FaChartBar,
  FaCog,
  FaUserShield,
  FaChevronRight,
  FaChevronDown,
  FaRegCommentDots,
  FaChartLine,
} from "react-icons/fa";
import { MdChecklist } from "react-icons/md";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/sidebar.css";

const Sidebar = ({ isCollapsed, onClose }) => {
  const { isAdmin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    return parseInt(sessionStorage.getItem("unreadMessagesCount") || "0", 10);
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      setUnreadCount(e.detail);
    };
    window.addEventListener("unreadMessagesUpdate", handleUpdate);
    return () => window.removeEventListener("unreadMessagesUpdate", handleUpdate);
  }, []);

  const handleItemClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-icon">
          <MdChecklist />
        </div>
        <div className="sidebar-logo-text">
          <h2>TaskFlow <span>Pro</span></h2>
          <p>Task Management & Progress Tracker</p>
        </div>
        <button className="sidebar-close-btn" onClick={handleItemClick}>
          &times;
        </button>
      </div>

      <nav className="sidebar-menu">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaHome />
            <span>Dashboard</span>
          </div>
        </NavLink>

        <NavLink
          to="/projects"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaFolderOpen />
            <span>Projects</span>
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaTasks />
            <span>Tasks</span>
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/teams"
            className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
            onClick={handleItemClick}
          >
            <div className="menu-item-left">
              <FaUsers />
              <span>Team Management</span>
            </div>
            <FaChevronRight className="menu-item-arrow" />
          </NavLink>
        )}

        {isAdmin && (
          <div className="submenu-group">
            <NavLink
              to="/users"
              className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
              onClick={handleItemClick}
            >
              <div className="menu-item-left">
                <FaUserShield />
                <span>User Management</span>
              </div>
              <FaChevronDown className="menu-item-arrow active" style={{ transform: "rotate(180deg)", opacity: 0.5 }} />
            </NavLink>
            <div className="sidebar-submenu">
              <NavLink
                to="/users"
                className={({ isActive }) => (isActive ? "submenu-item active" : "submenu-item")}
                onClick={handleItemClick}
              >
                <span className="submenu-dot">•</span> Users
              </NavLink>
            </div>
          </div>
        )}

        <NavLink
          to="/progress"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaChartLine />
            <span>Progress Tracking</span>
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaChartBar />
            <span>Reports</span>
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>

        <NavLink
          to="/messages"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaRegCommentDots />
            <span>Messages</span>
            {unreadCount > 0 && (
              <div className="sidebar-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
          onClick={handleItemClick}
        >
          <div className="menu-item-left">
            <FaCog />
            <span>Settings</span>
          </div>
          <FaChevronRight className="menu-item-arrow" />
        </NavLink>
      </nav>

      <div className="sidebar-promo-container">
        <div className="sidebar-copyright" style={{ marginTop: 0 }}>
          © 2025 TaskFlow Pro
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

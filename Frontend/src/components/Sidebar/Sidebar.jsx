import { useEffect, useState } from "react";
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
import { APP_CONFIG } from "../../app/config/appConfig";
import { APP_NAVIGATION } from "../../app/config/navigation";
import { hasRequiredRole } from "../../app/config/roles";
import { useAuth } from "../../context/AuthContext";
import "../../styles/sidebar.css";

const iconMap = {
  "/dashboard": <FaHome />,
  "/projects": <FaFolderOpen />,
  "/tasks": <FaTasks />,
  "/teams": <FaUsers />,
  "/users": <FaUserShield />,
  "/progress": <FaChartLine />,
  "/reports": <FaChartBar />,
  "/messages": <FaRegCommentDots />,
  "/settings": <FaCog />,
};

const Sidebar = ({ isCollapsed, onClose }) => {
  const { isAdmin, user } = useAuth();
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

  const sidebarItems = APP_NAVIGATION.filter((item) => {
    if (item.path === "/calendar") return false;
    return hasRequiredRole(user?.role, item.roles || []);
  });

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-icon">
          <MdChecklist />
        </div>
        <div className="sidebar-logo-text">
          <h2>{APP_CONFIG.appNamePrimary} <span>{APP_CONFIG.appNameAccent}</span></h2>
          <p>{APP_CONFIG.appTagline}</p>
        </div>
        <button className="sidebar-close-btn" onClick={handleItemClick}>
          &times;
        </button>
      </div>

      <nav className="sidebar-menu">
        {sidebarItems.map((item) => {
          if (item.path === "/users") {
            return (
              <div key={item.path} className="submenu-group">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
                  onClick={handleItemClick}
                >
                  <div className="menu-item-left">
                    {iconMap[item.path]}
                    <span>{item.label}</span>
                  </div>
                  <FaChevronDown className="menu-item-arrow active" style={{ transform: "rotate(180deg)", opacity: 0.5 }} />
                </NavLink>
                <div className="sidebar-submenu">
                  <NavLink
                    to="/users"
                    className={({ isActive }) => (isActive ? "submenu-item active" : "submenu-item")}
                    onClick={handleItemClick}
                  >
                    <span className="submenu-dot">â€¢</span> Users
                  </NavLink>
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
              onClick={handleItemClick}
            >
              <div className="menu-item-left">
                {iconMap[item.path]}
                <span>{item.label}</span>
                {item.path === "/messages" && unreadCount > 0 && (
                  <div className="sidebar-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </div>
                )}
              </div>
              {item.path !== "/dashboard" && <FaChevronRight className="menu-item-arrow" />}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-promo-container">
        <div className="sidebar-copyright" style={{ marginTop: 0 }}>
          {APP_CONFIG.shortCopyrightText}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

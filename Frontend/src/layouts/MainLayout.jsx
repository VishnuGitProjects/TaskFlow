import { useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import Sidebar from "../components/Sidebar/Sidebar";
import "../styles/layout.css";

const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth <= 768);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleCloseSidebar = () => {
    setIsSidebarCollapsed(true);
  };

  return (
    <div className="layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onClose={handleCloseSidebar} />
      {!isSidebarCollapsed && (
        <div className="sidebar-backdrop" onClick={handleCloseSidebar} />
      )}
      <div className="layout-body">
        <Navbar onToggleSidebar={handleToggleSidebar} />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
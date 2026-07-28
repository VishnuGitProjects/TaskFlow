import { useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import Sidebar from "../components/Sidebar/Sidebar";
import "../styles/layout.css";

const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="layout">
      <Sidebar isCollapsed={isSidebarCollapsed} />
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
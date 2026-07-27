import Navbar from "../components/Navbar/Navbar";
import Sidebar from "../components/Sidebar/Sidebar";
import "../styles/layout.css";

const MainLayout = ({ children }) => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-body">
        <Navbar />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
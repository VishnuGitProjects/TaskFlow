import "../../styles/dashboard.css";

const RecentProjects = () => {
  return (
    <div className="dashboard-card">

      <h2>Recent Projects</h2>

      <div className="project-item">
        <h4>Project Alpha</h4>
        <p>75% Complete • Due: July 15</p>
      </div>

      <div className="project-item">
        <h4>CRM Dashboard</h4>
        <p>45% Complete • Due: July 20</p>
      </div>

      <div className="project-item">
        <h4>Website Redesign</h4>
        <p>90% Complete • Due: July 30</p>
      </div>

    </div>
  );
};

export default RecentProjects;
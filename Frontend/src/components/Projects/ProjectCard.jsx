const statusClass = (status) => {
  const map = {
    "Planning":    "planning",
    "In Progress": "in-progress",
    "On Hold":     "on-hold",
    "Completed":   "completed",
    "Cancelled":   "cancelled",
  };
  return map[status] || "planning";
};

const priorityClass = (priority) =>
  priority ? priority.toLowerCase() : "medium";

const ProjectCard = ({ project, canEdit = false, onEdit, onDelete }) => {
  return (
    <div className="project-card">

      {/* Top: name + status badge */}
      <div className="project-header">
        <h3>{project.name}</h3>
        <span className={`status ${statusClass(project.status)}`}>
          {project.status}
        </span>
      </div>

      {/* Description */}
      <p className="project-description">
        {project.description || "No description provided."}
      </p>

      {/* Footer: priority + date */}
      <div className="project-footer">
        <span className={`priority ${priorityClass(project.priority)}`}>
          {project.priority}
        </span>

        <span className="project-date">
          {project.endDate
            ? `Due: ${new Date(project.endDate).toLocaleDateString()}`
            : project.startDate
            ? `Start: ${new Date(project.startDate).toLocaleDateString()}`
            : "No date set"}
        </span>
      </div>

      {/* Action buttons — only for admin/manager */}
      {canEdit && (
        <div className="project-actions">
          <button className="edit-btn" onClick={onEdit}>
            ✏️ Edit
          </button>
          <button className="delete-btn" onClick={onDelete}>
            🗑️ Delete
          </button>
        </div>
      )}

    </div>
  );
};

export default ProjectCard;
import { useState, useEffect } from "react";
import "./CreateProjectModal.css"; // reuse same styles

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const getPastDateString = (daysBack) => {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split("T")[0];
};

const EditProjectModal = ({ isOpen, project, onClose, onUpdate, users = [], teams = [] }) => {
  const todayDate = getTodayDateString();
  const minimumStartDate = getPastDateString(30);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Planning",
    priority: "Medium",
    startDate: "",
    endDate: "",
    team: "",
    members: [],
  });

  // Pre-fill form when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "Planning",
        priority: project.priority || "Medium",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split("T")[0]
          : todayDate,
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split("T")[0]
          : "",
        team: project.team?._id || project.team || "",
        members: Array.isArray(project.members) ? project.members.map(m => m.user?._id || m.user || m._id || m) : [],
      });
    }
  }, [project, todayDate]);

  const handleChange = (e) => {
    if (e.target.name === "team") {
      const nextTeamId = e.target.value;
      const selectedTeam = teams.find((team) => team._id === nextTeamId);
      const nextTeamMembers = [];

      if (selectedTeam?.manager?._id || selectedTeam?.manager) {
        nextTeamMembers.push(String(selectedTeam.manager?._id || selectedTeam.manager));
      }
      (selectedTeam?.members || []).forEach((member) => {
        nextTeamMembers.push(String(member._id || member));
      });

      setFormData({
        ...formData,
        team: nextTeamId,
        members: [...new Set(nextTeamMembers)],
      });
      return;
    }

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const teamMemberIds = (() => {
    const selectedTeam = teams.find((team) => team._id === formData.team);
    if (!selectedTeam) return [];

    const ids = [];
    if (selectedTeam.manager?._id || selectedTeam.manager) {
      ids.push(String(selectedTeam.manager?._id || selectedTeam.manager));
    }
    (selectedTeam.members || []).forEach((member) => {
      ids.push(String(member._id || member));
    });
    return [...new Set(ids)];
  })();

  const handleToggleMember = (userId) => {
    if (teamMemberIds.includes(String(userId))) {
      return;
    }

    const isSelected = formData.members.includes(userId);
    if (isSelected) {
      setFormData({
        ...formData,
        members: formData.members.filter(id => id !== userId)
      });
    } else {
      setFormData({
        ...formData,
        members: [...formData.members, userId]
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Project name is required.");
      return;
    }
    onUpdate(project._id, {
      ...formData,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Edit Project</h2>

        <input
          type="text"
          name="name"
          placeholder="Project Name *"
          value={formData.name}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        />

        <div className="modal-row">
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option>Planning</option>
              <option>In Progress</option>
              <option>On Hold</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>

        <div className="modal-row">
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              min={minimumStartDate}
              max={todayDate}
            />
          </div>
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-row">
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Assigned Team</label>
            <select name="team" value={formData.team} onChange={handleChange}>
              <option value="">No Team</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label style={{ color: "#94a3b8", fontSize: "13px", marginTop: "8px" }}>Assign Team Members</label>
        <div style={{
          maxHeight: "100px",
          overflowY: "auto",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "6px",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          textAlign: "left"
        }}>
          {users.map((userItem) => (
            <label key={userItem._id} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "12.5px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.members.includes(userItem._id)}
                onChange={() => handleToggleMember(userItem._id)}
                disabled={teamMemberIds.includes(String(userItem._id))}
              />
              <span>{userItem.name} ({userItem.role}){teamMemberIds.includes(String(userItem._id)) ? " - from team" : ""}</span>
            </label>
          ))}
        </div>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="create-btn" onClick={handleSubmit}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

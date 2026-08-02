import { useState } from "react";
import "./CreateProjectModal.css"; // Reuse same glassmorphic modal styles

const AddProjectMemberModal = ({ isOpen, project, onClose, onAddMember }) => {
  const [formData, setFormData] = useState({
    email: "",
    role: "member",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      alert("Email is required.");
      return;
    }
    setLoading(true);
    try {
      await onAddMember(project._id, formData);
      setFormData({ email: "", role: "member" });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "420px" }}>
        <h2>Add Member to Project</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "-8px", marginBottom: "8px" }}>
          Project: <strong style={{ color: "#fff" }}>{project.name}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Email Address</label>
            <input
              type="email"
              required
              placeholder="Enter member's email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ padding: "12px", borderRadius: "8px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </div>

          <div className="modal-col">
            <label style={{ color: "#94a3b8", fontSize: "12.5px" }}>Project Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ padding: "12px", borderRadius: "8px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            >
              <option value="member">Team Member</option>
              <option value="project_manager">Project Manager</option>
            </select>
          </div>

          <div className="modal-buttons" style={{ marginTop: "12px" }}>
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={loading} style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
              {loading ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectMemberModal;

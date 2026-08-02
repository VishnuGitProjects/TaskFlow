import { useState } from "react";
import { FaTrash, FaUserShield, FaCrown } from "react-icons/fa";
import { assignMemberRole, removeMemberFromProject, transferProjectOwnership } from "../../services/projectService";
import { getVisibleProjectMembers } from "../../app/helpers/projectPermissions";
import "./CreateProjectModal.css";

const ManageProjectMembersModal = ({ isOpen, project, currentUser, onClose, onRefresh }) => {
  const [loadingMemberId, setLoadingMemberId] = useState(null);

  if (!isOpen || !project) return null;

  const currentUserIdStr = String(currentUser?.id || currentUser?._id);
  const visibleMembers = getVisibleProjectMembers(project);

  const handleRoleChange = async (memberUserId, newRole) => {
    const memberName = visibleMembers.find(m => String(m.user?._id || m.user) === String(memberUserId))?.user?.name || "this user";
    
    if (newRole === "owner") {
      const confirmTransfer = window.confirm(
        `Are you sure you want to transfer project ownership to ${memberName}?\nWarning: You will lose owner controls and become a regular member.`
      );
      if (!confirmTransfer) return;
    }

    try {
      setLoadingMemberId(memberUserId);
      if (newRole === "owner") {
        await transferProjectOwnership(project._id, memberUserId);
        alert(`Ownership transferred to ${memberName} successfully!`);
        onClose();
      } else {
        await assignMemberRole(project._id, memberUserId, newRole);
        alert(`Role updated successfully.`);
      }
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    const memberName = visibleMembers.find(m => String(m.user?._id || m.user) === String(memberUserId))?.user?.name || "this user";
    const confirmRemove = window.confirm(`Are you sure you want to remove ${memberName} from this project?`);
    if (!confirmRemove) return;

    try {
      setLoadingMemberId(memberUserId);
      await removeMemberFromProject(project._id, memberUserId);
      alert(`${memberName} has been removed from the project.`);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "550px" }}>
        <h2>Manage Project Members</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>
          Project: <strong style={{ color: "#fff" }}>{project.name}</strong>
        </p>

        <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {/* Owner details */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <h4 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                {project.owner?.name || "Unknown"} <FaCrown style={{ color: "#f59e0b" }} title="Project Owner" />
              </h4>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{project.owner?.email}</span>
            </div>
            <span style={{ fontSize: "12.5px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", padding: "3px 8px", borderRadius: "12px", fontWeight: "600" }}>
              Owner
            </span>
          </div>

          {/* Members list */}
          {visibleMembers.map((member) => {
            const memberUser = member.user || {};
            const userId = memberUser._id || member;
            const isSelf = String(userId) === currentUserIdStr;

            return (
              <div key={userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <h4 style={{ margin: 0, color: "#fff" }}>
                    {memberUser.name || "Member"} {isSelf && <span style={{ fontSize: "10px", color: "#8b5cf6" }}>(You)</span>}
                  </h4>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{memberUser.email}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <select
                    value={member.role || "member"}
                    disabled={loadingMemberId === userId || isSelf}
                    onChange={(e) => handleRoleChange(userId, e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", background: "#374151", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "12.5px" }}
                  >
                    <option value="member">Member</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="admin">Project Admin</option>
                    <option value="owner">Owner (Transfer)</option>
                  </select>

                  <button
                    disabled={loadingMemberId === userId || isSelf}
                    onClick={() => handleRemoveMember(userId)}
                    style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "none", width: "30px", height: "30px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    title="Remove Member"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {visibleMembers.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "12px" }}>No other members in this project.</p>
          )}
        </div>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageProjectMembersModal;

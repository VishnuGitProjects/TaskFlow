const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // The actor performing the action
    },
    action: {
      type: String,
      required: true, // e.g., "TRANSFER_OWNERSHIP", "REMOVE_MEMBER", "ASSIGN_ROLE", "LEAVE_PROJECT"
    },
    details: {
      type: String,
      required: true, // Human-readable description
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);

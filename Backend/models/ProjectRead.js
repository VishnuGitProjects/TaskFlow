const mongoose = require("mongoose");

const projectReadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

projectReadSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model("ProjectRead", projectReadSchema);

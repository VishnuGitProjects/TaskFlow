const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["To Do", "In Progress", "Review", "Completed"],
      default: "To Do",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    dueDate: {
      type: Date,
    },

    // Which project this task belongs to
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    // Who created the task (Project Manager)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who is assigned to this task (Team Member)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Attachments stored as array of file info objects
    attachments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        filename: String,
        url: String,
        mimeType: {
          type: String,
          default: "",
        },
        size: {
          type: Number,
          default: 0,
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        replies: [
          {
            _id: {
              type: mongoose.Schema.Types.ObjectId,
              auto: true,
            },
            author: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            message: {
              type: String,
              required: true,
              trim: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);

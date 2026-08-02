const mongoose = require("mongoose");
const { GLOBAL_ROLES } = require("../utils/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address."],
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: GLOBAL_ROLES,
      default: "team_member",
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Email verification fields
    isVerified: {
      type: Boolean,
      default: true,
    },

    verificationToken: {
      type: String,
    },

    verificationTokenExpiry: {
      type: Date,
    },

    // Profile picture URL (optional)
    avatar: {
      type: String,
      default: "",
    },

    // For forgot password flow
    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);

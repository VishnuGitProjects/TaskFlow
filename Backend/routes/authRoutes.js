const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;

const buildResetUrl = (token) => {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${clientUrl}/reset-password?token=${token}`;
};

const sendPasswordResetMessage = async (user, resetUrl) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    console.log(`[PASSWORD RESET] ${user.email}: ${resetUrl}`);
    return false;
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: resendFromEmail,
    to: user.email,
    subject: "Reset your TaskFlow password",
    html: `
      <p>Hello ${user.name || "there"},</p>
      <p>We received a request to reset your TaskFlow password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
  return true;
};
/* ===========================
   REGISTER
=========================== */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate empty fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required." });
    }
    if (!confirmPassword) {
      return res.status(400).json({ success: false, message: "Confirm password is required." });
    }

    // Trim and validate email format
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    // Password strength check (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    // Confirm passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    // Check duplicate email (AFTER format validation)
    const existingUser = await User.findOne({ email: trimmedEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with isVerified = true directly
    const newUser = new User({
      name: name.trim(),
      email: trimmedEmail.toLowerCase(),
      password: hashedPassword,
      isVerified: true,
      role: "team_member"
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful. You can now log in."
    });
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error during registration."
    });
  }
});

/* ===========================
   LOGIN
=========================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate Input
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required." });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

/* ===========================
   SOCIAL LOGIN (SIMULATOR FOR OTHER PROVIDERS)
=========================== */
router.post("/social-login", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Social login simulator is disabled in production." });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Account not found. Please register first." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GOOGLE OAUTH LOGIN
=========================== */
router.post("/google-login", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        message: "Google OAuth credentials are not configured in backend .env file."
      });
    }

    const axios = require("axios");

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const { id_token } = tokenResponse.data;

    // Verify ID token with Google's tokeninfo endpoint
    const tokenInfoResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`
    );

    const { email, name, email_verified, aud } = tokenInfoResponse.data;

    if (aud !== clientId) {
      return res.status(400).json({ message: "Invalid token audience (Client ID mismatch)." });
    }

    if (!email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Auto-register the Google authenticated user
      const generatedPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: true,
        role: "team_member"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Google OAuth Error:", error.response?.data || error.message);
    res.status(500).json({
      message: error.response?.data?.error_description || "Google authentication failed"
    });
  }
});

/* ===========================
   FORGOT PASSWORD
=========================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: trimmedEmail.toLowerCase() });
    const genericResponse = {
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    };

    if (!user || !user.isActive) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);
    await user.save();

    const resetUrl = buildResetUrl(rawToken);

    try {
      await sendPasswordResetMessage(user, resetUrl);
    } catch (emailError) {
      console.error("Forgot Password Email Error:", emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({
        success: false,
        message: "Unable to send password reset email right now. Please try again later.",
      });
    }

    const responsePayload = { ...genericResponse };
    if (process.env.NODE_ENV !== "production") {
      responsePayload.resetUrl = resetUrl;
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ===========================
   RESET PASSWORD
=========================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({ success: false, message: "Reset token is required." });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "New password is required." });
    }
    if (!confirmPassword) {
      return res.status(400).json({ success: false, message: "Confirm password is required." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const hashedToken = crypto.createHash("sha256").update(String(token).trim()).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ===========================
   CHANGE PASSWORD
=========================== */
router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    // Password strength check (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   UPDATE PROFILE
=========================== */
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email is already taken by another user." });
      }
      user.email = email.toLowerCase();
    }
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GET CURRENT USER (ME)
========================== */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   DELETE ACCOUNT
=========================== */
router.delete("/delete-account", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find all projects owned by the user and cascade delete them
    const Project = require("../models/Project");
    const Task = require("../models/Task");
    const Notification = require("../models/Notification");
    const ActivityLog = require("../models/ActivityLog");

    const ownedProjects = await Project.find({ owner: userId });
    for (const proj of ownedProjects) {
      await Task.deleteMany({ project: proj._id });
      await Notification.deleteMany({ relatedId: proj._id });
      await ActivityLog.deleteMany({ project: proj._id });
      await proj.deleteOne();
    }

    // 2. Remove user from members list of other projects
    await Project.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // 3. Delete teams created by the user, pull from other teams, set manager null
    const Team = require("../models/Team");
    await Team.deleteMany({ createdBy: userId });
    await Team.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );
    await Team.updateMany(
      { manager: userId },
      { $set: { manager: null } }
    );

    // 4. Unassign tasks assigned to the user in other projects
    await Task.updateMany(
      { assignedTo: userId },
      { $set: { assignedTo: null } }
    );

    // 5. Delete user notifications and activity logs
    await Notification.deleteMany({ recipient: userId });
    await Notification.deleteMany({ sender: userId });
    await ActivityLog.deleteMany({ user: userId });

    // 6. Permanently delete the user document
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "Account deleted successfully"
    });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;

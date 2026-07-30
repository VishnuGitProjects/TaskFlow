const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();
const transporter = require("../config/mail");
const rateLimit = require("express-rate-limit");

// Helper to retrieve the configured client and backend URLs.
const getClientAndBackendUrls = (req) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  return { clientUrl, backendUrl };
};

router.get("/verify-smtp", async (req, res) => {
  try {
    const emailUserSet = !!process.env.EMAIL_USER;
    const emailPassSet = !!process.env.EMAIL_PASS;
    const mongoUriSet = !!process.env.MONGO_URI;
    const jwtSecretSet = !!process.env.JWT_SECRET;
    
    console.log("Testing SMTP connection...");
    let smtpError = null;
    let smtpSuccess = false;
    try {
      await transporter.verify();
      smtpSuccess = true;
    } catch (err) {
      smtpError = {
        message: err.message,
        code: err.code,
        command: err.command
      };
    }

    return res.status(200).json({
      success: true,
      env: {
        EMAIL_USER: emailUserSet,
        EMAIL_PASS: emailPassSet,
        MONGO_URI: mongoUriSet,
        JWT_SECRET: jwtSecretSet,
      },
      smtp: {
        success: smtpSuccess,
        error: smtpError
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Rate limiter for verification resends to prevent spamming
const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many verification resend requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ===========================
   REGISTER
=========================== */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

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

    

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const verificationTokenExpiry = Date.now() + 24 * 3600000; // 24 hours

    // Create user with isVerified = false
    const newUser = new User({
      name: name.trim(),
      email: trimmedEmail.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
      role: "team_member"
    });

    await newUser.save();

    const { backendUrl } = getClientAndBackendUrls(req);
    const verificationLink =
      `${backendUrl}/api/auth/verify/${verificationToken}?email=${encodeURIComponent(email)}`;

    console.log("Sending verification email...");

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your TaskFlow Account",
        html: `
            <h2>Welcome to TaskFlow</h2>
            <p>Click the button below to verify your email.</p>
            <p><a href="${verificationLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Verify Email</a></p>
        `
      });
      console.log("Email sent successfully!");
      return res.status(201).json({
        success: true,
        message: "Verification email sent successfully."
      });
    } catch (mailErr) {
      console.error("Failed to send verification email:", mailErr);
      
      const isBlocked = mailErr.code === "ETIMEDOUT" || mailErr.code === "ECONNREFUSED" || mailErr.message?.includes("timeout");
      if (isBlocked || process.env.NODE_ENV === "production") {
        console.warn("SMTP connection timed out or is blocked (likely Render Free Tier). Fallback: auto-verifying user.");
        newUser.isVerified = true;
        newUser.verificationToken = undefined;
        newUser.verificationTokenExpiry = undefined;
        await newUser.save();
        
        console.log(`\n=============================================`);
        console.log(`VERIFICATION LINK FOR ${email}:`);
        console.log(verificationLink);
        console.log(`=============================================\n`);
        
        return res.status(201).json({
          success: true,
          message: "Registration successful. (Auto-verified due to email service connection restrictions in production)."
        });
      }

      await User.deleteOne({ _id: newUser._id });
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Registration rolled back, please try again."
      });
    }
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error during registration."
    });
  }
});

/* ===========================
   EMAIL VERIFICATION
=========================== */
router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  const { email } = req.query;
  const { clientUrl } = getClientAndBackendUrls(req);

  console.log(`\n--- [VERIFY ROUTE] GET /api/auth/verify/${token} ---`);
  console.log("REQUEST RECEIVED");
  console.log(`TOKEN: ${token}`);
  if (email) console.log(`EMAIL QUERY: ${email}`);

  try {
    // 1. Try to find the user by the verification token
    let user = await User.findOne({
      verificationToken: token,
    });

    if (user) {
      console.log(`USER FOUND: ${user.email}`);

      if (user.verificationTokenExpiry < Date.now()) {
        console.log(`[VERIFY ROUTE] TOKEN EXPIRED FOR USER: ${user.email}`);
        return res.redirect(`${clientUrl}/login?error=expired`);
      }

      user.isVerified = true;
      console.log("USER VERIFIED: isVerified set to true");

      user.verificationToken = undefined;
      user.verificationTokenExpiry = undefined;
      console.log("TOKEN CLEARED");

      await user.save();

      const dest = `${clientUrl}/login?verified=true`;
      console.log(`redirect destination: ${dest}`);
      console.log("REDIRECT STARTED");
      return res.redirect(dest);
    }

    // 2. If token is not found/already cleared, check if email is provided
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user && user.isVerified) {
        console.log(`already verified: ${user.email}`);
        const dest = `${clientUrl}/login?verified=true`;
        console.log(`redirect destination: ${dest}`);
        console.log("REDIRECT STARTED");
        return res.redirect(dest);
      }
    }

    console.log("Invalid verification link - User/Token not matched");
    return res.redirect(`${clientUrl}/login?error=invalid`);
  } catch (err) {
    console.error("[VERIFY ROUTE] ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});


/* ===========================
   RESEND VERIFICATION EMAIL
=========================== */
router.post("/resend-verification", resendVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "This email is already verified." });
    }

    // Cooldown check (1 minute) to prevent spamming the user's inbox
    if (user.verificationTokenExpiry) {
      const lastSent = new Date(user.verificationTokenExpiry).getTime() - 24 * 60 * 60 * 1000;
      const timePassed = Date.now() - lastSent;
      if (timePassed < 60 * 1000) {
        const secondsLeft = Math.ceil((60 * 1000 - timePassed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsLeft} seconds before requesting another verification email.`
        });
      }
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = verificationTokenExpiry;
    await user.save();

    const { backendUrl } = getClientAndBackendUrls(req);
    const verificationLink =
      `${backendUrl}/api/auth/verify/${verificationToken}?email=${encodeURIComponent(normalizedEmail)}`;

    console.log(`Resending verification email to: ${normalizedEmail}`);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: "Verify Your TaskFlow Account",
        html: `
            <h2>Welcome to TaskFlow</h2>
            <p>Click the button below to verify your email.</p>
            <p><a href="${verificationLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Verify Email</a></p>
        `
      });
      console.log("Resend email sent successfully!");
      return res.status(200).json({
        success: true,
        message: "A new verification email has been sent."
      });
    } catch (mailErr) {
      console.error("Failed to send verification email:", mailErr);
      
      const isBlocked = mailErr.code === "ETIMEDOUT" || mailErr.code === "ECONNREFUSED" || mailErr.message?.includes("timeout");
      if (isBlocked || process.env.NODE_ENV === "production") {
        console.warn("SMTP connection timed out or is blocked (likely Render Free Tier). Fallback: auto-verifying user.");
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();
        
        return res.status(200).json({
          success: true,
          message: "Account verified successfully. (Auto-verified due to email service connection restrictions in production)."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later."
      });
    }
  } catch (err) {
    console.error("Resend Verification Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error during resending verification."
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

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in."
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
    const { email, name, provider, avatar } = req.body;

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

    const { email, name, picture, email_verified, aud } = tokenInfoResponse.data;

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
    const user = await User.findOne({ email: email ? email.toLowerCase() : "" });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
      await user.save();

      // Log to console for easy developer testing
      console.log(`\n=============================================`);
      console.log(`RESET PASSWORD LINK FOR ${email}:`);
      console.log(`${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`);
      console.log(`=============================================\n`);

      // Actually send the email using Nodemailer
      const resetLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Reset Your TaskFlow Password",
          html: `
              <h2>Password Reset Request</h2>
              <p>You requested to reset your password. Click the button below to complete the reset. This link will expire in 1 hour.</p>
              <p><a href="${resetLink}" style="display:inline-block;background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p>
          `
        });
        console.log("Password reset email sent successfully!");
      } catch (mailErr) {
        console.error("Failed to send password reset email via SMTP:", mailErr);
        console.warn(`[WARNING] SMTP is blocked in this environment (likely Render Free Tier). Reset Link: ${resetLink}`);
      }
    } else {
      console.log(`Forgot password requested for non-existent email: ${email}`);
    }

    res.status(200).json({
      message: "If that email address exists in our database, we have sent a password reset link to it.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   RESET PASSWORD
=========================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    // Password policy check (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
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
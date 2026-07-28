const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

dotenv.config();

// ─── Environment Verification ────────────────────────────
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL", "BACKEND_URL", "EMAIL_USER", "EMAIL_PASS"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.warn(`[WARNING] Production Environment check failed: Missing ${varName}`);
  }
});

const app = express();

// Trust reverse proxy (Vite proxy / ngrok) to get correct client IPs for rate-limiting
app.set("trust proxy", 1);

// ─── Custom Request Logger ───────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ─── Rate Limiter ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// ─── Restricted CORS Config ──────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://customary-shrapnel-backboned.ngrok-free.dev",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost")) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ─── Secure Headers Middleware ──────────────────────────
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// ─── Routes ─────────────────────────────────────────────
const authRoutes    = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes    = require("./routes/taskRoutes");
const userRoutes    = require("./routes/userRoutes");
const teamRoutes    = require("./routes/teamRoutes");
const reportRoutes  = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth",     authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks",    taskRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/teams",    teamRoutes);
app.use("/api/reports",  reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);

// ─── Health Check ────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("TaskFlow Backend is running 🚀");
});

// ─── Global Error Handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[GLOBAL ERROR] ${err.message}`, err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ─── Connect DB ──────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
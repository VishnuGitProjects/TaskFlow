const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { createCorsOptions } = require("./config/cors");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messageRoutes = require("./routes/messageRoutes");

const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10000,
      message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes.",
      },
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: "12mb" }));

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/messages", messageRoutes);

  app.get("/", (req, res) => {
    res.send("TaskFlow Backend is running");
  });

  app.use((err, req, res, next) => {
    console.error(`[GLOBAL ERROR] ${err.message}`, err.stack);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  });

  return app;
};

module.exports = {
  createApp,
};

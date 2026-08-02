const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const { connectDatabase } = require("../config/database");
const User = require("../models/User");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DEFAULT_USERS = [
  {
    name: "TaskFlow Admin",
    email: "admin@taskflow.local",
    password: "Admin@12345",
    role: "admin",
  },
  {
    name: "TaskFlow Project Manager",
    email: "pm@taskflow.local",
    password: "Manager@12345",
    role: "project_manager",
  },
  {
    name: "TaskFlow Team Member",
    email: "member@taskflow.local",
    password: "Member@12345",
    role: "team_member",
  },
];

const upsertUser = async ({ name, email, password, role }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.password = hashedPassword;
    existing.role = role;
    existing.isActive = true;
    existing.isVerified = true;
    await existing.save();
    return { action: "updated", user: existing, password };
  }

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    isActive: true,
    isVerified: true,
  });

  return { action: "created", user, password };
};

const main = async () => {
  try {
    await connectDatabase();
    const results = [];

    for (const userData of DEFAULT_USERS) {
      const result = await upsertUser(userData);
      results.push(result);
    }

    console.log("Default users seeded successfully:");
    results.forEach((result) => {
      console.log(
        `- ${result.user.role}: ${result.user.email} (${result.action}) / password: ${result.password}`
      );
    });
  } catch (error) {
    console.error("Failed to seed default users:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();

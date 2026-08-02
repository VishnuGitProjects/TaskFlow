const path = require("path");
const readline = require("readline");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const projectConfig = require("../../shared/projectConfig.json");
const { connectDatabase } = require("../config/database");
const User = require("../models/User");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const parseCliArgs = () => {
  const parsed = {};

  process.argv.slice(2).forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const [key, value] = arg.slice(2).split("=");
    if (!key) return;
    parsed[key] = value || "";
  });

  return parsed;
};

const prompt = (question, { mask = false } = {}) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!mask) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  rl.stdoutMuted = true;
  rl._writeToOutput = function writeToOutput(stringToWrite) {
    if (rl.stdoutMuted && stringToWrite.trim()) {
      rl.output.write("*");
      return;
    }

    rl.output.write(stringToWrite);
  };

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
};

const resolveAdminInput = async () => {
  const cliArgs = parseCliArgs();
  const defaultAdmin = projectConfig.adminSeed;

  const name =
    cliArgs.name ||
    process.env.ADMIN_NAME ||
    defaultAdmin.name ||
    (await prompt("Admin name: "));

  const email =
    cliArgs.email ||
    process.env.ADMIN_EMAIL ||
    defaultAdmin.email ||
    (await prompt("Admin email: "));

  const password =
    cliArgs.password ||
    process.env.ADMIN_PASSWORD ||
    (await prompt("Admin password: ", { mask: true }));

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
  };
};

const validateAdminInput = ({ name, email, password }) => {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in Backend/.env.");
  }

  if (!name) {
    throw new Error("Admin name is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Admin email is not valid.");
  }

  if (password.length < 8) {
    throw new Error("Admin password must be at least 8 characters long.");
  }
};

const upsertAdminUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  const hashedPassword = await bcrypt.hash(password, 12);

  if (existingUser) {
    existingUser.name = name;
    existingUser.password = hashedPassword;
    existingUser.role = projectConfig.adminSeed.role || "admin";
    existingUser.isActive = true;
    existingUser.isVerified = true;
    await existingUser.save();

    return {
      action: "updated",
      user: existingUser,
    };
  }

  const createdUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role: projectConfig.adminSeed.role || "admin",
    isActive: true,
    isVerified: true,
  });

  return {
    action: "created",
    user: createdUser,
  };
};

const main = async () => {
  try {
    const adminInput = await resolveAdminInput();
    validateAdminInput(adminInput);

    await connectDatabase();
    const result = await upsertAdminUser(adminInput);

    console.log(
      `Admin user ${result.action}: ${result.user.email} (${result.user.role})`
    );
  } catch (error) {
    console.error("Failed to create admin user:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();

/**
 * Database Migration Script: Normalize Project Members Schema
 * Run with: node migrateProjects.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Project = require("./models/Project");
const User = require("./models/User");

async function migrateProjects() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected successfully!");

    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects to inspect.`);

    for (const project of projects) {
      console.log(`\nInspecting Project: "${project.name}" (ID: ${project._id})`);
      
      const rawMembers = project.members || [];
      const updatedMembers = [];
      const seenUserIds = new Set();

      // Always ensure owner is a member
      if (project.owner) {
        const ownerIdStr = String(project.owner);
        updatedMembers.push({
          user: project.owner,
          role: "owner",
          joinedAt: project.createdAt || new Date()
        });
        seenUserIds.add(ownerIdStr);
        console.log(`- Ensuring owner is a member: ${ownerIdStr}`);
      }

      for (const m of rawMembers) {
        let memberUserId = null;
        let memberRole = "member";

        // Check if raw member is just an ObjectId (flat array)
        if (m.buffer) {
          memberUserId = m.buffer;
        } else if (m instanceof mongoose.Types.ObjectId || (typeof m === "string") || (m._id && !m.user)) {
          memberUserId = m._id || m;
        } else if (m.user) {
          memberUserId = m.user._id || m.user;
          memberRole = m.role || "member";
        }

        if (memberUserId) {
          const userIdStr = String(memberUserId);
          if (!seenUserIds.has(userIdStr)) {
            // Check if user exists in the database
            const userExists = await User.findById(memberUserId);
            if (userExists) {
              updatedMembers.push({
                user: memberUserId,
                role: memberRole === "owner" ? "owner" : "member",
                joinedAt: m.joinedAt || new Date()
              });
              seenUserIds.add(userIdStr);
              console.log(`- Adding member: ${userIdStr} (Role: ${memberRole})`);
            } else {
              console.log(`- Skipping non-existent user: ${userIdStr}`);
            }
          }
        }
      }

      project.members = updatedMembers;
      // Mark as modified to force Mongoose to save the array updates
      project.markModified("members");
      await project.save();
      console.log(`✅ Project "${project.name}" normalized successfully!`);
    }

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

migrateProjects();

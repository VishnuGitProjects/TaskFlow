const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const { connectDatabase } = require("../config/database");
const User = require("../models/User");
const Team = require("../models/Team");
const Project = require("../models/Project");
const Task = require("../models/Task");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const ensureUser = async ({ name, email, password, role }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      isVerified: true,
    });
    return user;
  }

  user.name = name;
  user.password = hashedPassword;
  user.role = role;
  user.isActive = true;
  user.isVerified = true;
  await user.save();
  return user;
};

const main = async () => {
  try {
    await connectDatabase();

    const admin = await ensureUser({
      name: "TaskFlow Admin",
      email: "admin@taskflow.local",
      password: "Admin@12345",
      role: "admin",
    });

    const projectManager = await ensureUser({
      name: "TaskFlow Project Manager",
      email: "pm@taskflow.local",
      password: "Manager@12345",
      role: "project_manager",
    });

    const memberOne = await ensureUser({
      name: "TaskFlow Team Member",
      email: "member@taskflow.local",
      password: "Member@12345",
      role: "team_member",
    });

    const memberTwo = await ensureUser({
      name: "Anita Sharma",
      email: "anita@taskflow.local",
      password: "Member@12345",
      role: "team_member",
    });

    const memberThree = await ensureUser({
      name: "Rahul Verma",
      email: "rahul@taskflow.local",
      password: "Member@12345",
      role: "team_member",
    });

    let team = await Team.findOne({ name: "Delivery Squad Alpha" });
    if (!team) {
      team = await Team.create({
        name: "Delivery Squad Alpha",
        description: "Cross-functional team for product delivery and QA coordination.",
        createdBy: admin._id,
        manager: projectManager._id,
        members: [memberOne._id, memberTwo._id, memberThree._id],
      });
    } else {
      team.description = "Cross-functional team for product delivery and QA coordination.";
      team.createdBy = admin._id;
      team.manager = projectManager._id;
      team.members = [memberOne._id, memberTwo._id, memberThree._id];
      await team.save();
    }

    let project = await Project.findOne({ name: "Customer Portal Revamp" });
    if (!project) {
      project = await Project.create({
        name: "Customer Portal Revamp",
        description: "Modernize the customer-facing portal with improved UX, onboarding, and reporting flows.",
        status: "In Progress",
        priority: "High",
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-09-15"),
        progress: 58,
        owner: admin._id,
        team: team._id,
        members: [
          { user: projectManager._id, role: "project_manager", joinedAt: new Date("2026-07-15") },
          { user: memberOne._id, role: "member", joinedAt: new Date("2026-07-15") },
          { user: memberTwo._id, role: "member", joinedAt: new Date("2026-07-15") },
          { user: memberThree._id, role: "member", joinedAt: new Date("2026-07-15") },
        ],
      });
    } else {
      project.description = "Modernize the customer-facing portal with improved UX, onboarding, and reporting flows.";
      project.status = "In Progress";
      project.priority = "High";
      project.startDate = new Date("2026-07-15");
      project.endDate = new Date("2026-09-15");
      project.progress = 58;
      project.owner = admin._id;
      project.team = team._id;
      project.members = [
        { user: projectManager._id, role: "project_manager", joinedAt: new Date("2026-07-15") },
        { user: memberOne._id, role: "member", joinedAt: new Date("2026-07-15") },
        { user: memberTwo._id, role: "member", joinedAt: new Date("2026-07-15") },
        { user: memberThree._id, role: "member", joinedAt: new Date("2026-07-15") },
      ];
      await project.save();
    }

    const taskDefinitions = [
      {
        title: "Finalize portal requirements",
        description: "Review approved business requirements and capture any open scope decisions.",
        status: "To Do",
        priority: "High",
        dueDate: new Date("2026-08-05"),
        progress: 0,
        assignedTo: memberOne._id,
      },
      {
        title: "Build onboarding dashboard UI",
        description: "Create responsive onboarding components and connect them to sample API data.",
        status: "In Progress",
        priority: "Critical",
        dueDate: new Date("2026-08-08"),
        progress: 65,
        assignedTo: memberTwo._id,
      },
      {
        title: "Integrate notification service",
        description: "Connect notification APIs and prepare the feature for review testing.",
        status: "Review",
        priority: "High",
        dueDate: new Date("2026-08-04"),
        progress: 90,
        assignedTo: memberThree._id,
      },
      {
        title: "Execute regression test pack",
        description: "Run the regression checklist for the last sprint and capture evidence.",
        status: "Completed",
        priority: "Medium",
        dueDate: new Date("2026-07-30"),
        progress: 100,
        assignedTo: memberOne._id,
      },
      {
        title: "Prepare production deployment checklist",
        description: "Gather release notes, rollout steps, rollback plan, and approvals.",
        status: "To Do",
        priority: "Medium",
        dueDate: new Date("2026-08-12"),
        progress: 10,
        assignedTo: projectManager._id,
      },
    ];

    for (const taskDef of taskDefinitions) {
      let task = await Task.findOne({ project: project._id, title: taskDef.title });
      if (!task) {
        task = await Task.create({
          ...taskDef,
          project: project._id,
          createdBy: projectManager._id,
        });
      } else {
        Object.assign(task, taskDef, {
          project: project._id,
          createdBy: projectManager._id,
        });
        await task.save();
      }
    }

    console.log("Sample workspace seeded successfully.");
    console.log(`Project: Customer Portal Revamp`);
    console.log(`Assigned Team: Delivery Squad Alpha`);
    console.log(`Project Manager: ${projectManager.email}`);
    console.log(`Team Members: ${memberOne.email}, ${memberTwo.email}, ${memberThree.email}`);
    console.log("Tasks: 5 seeded across To Do, In Progress, Review, and Completed states.");
  } catch (error) {
    console.error("Failed to seed sample workspace:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();

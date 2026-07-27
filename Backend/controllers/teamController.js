const Team = require("../models/Team");

/* ==========================
   CREATE TEAM
========================== */
const createTeam = async (req, res) => {
  try {
    const { name, description, members, manager } = req.body;

    const team = await Team.create({
      name,
      description,
      members: members || [],
      manager: manager || null,
      createdBy: req.user._id,
    });

    await team.populate("members", "name email role");
    await team.populate("manager", "name email role");

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   GET ALL TEAMS
========================== */
const getTeams = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== "admin") {
      query.$or = [
        { createdBy: req.user._id },
        { manager: req.user._id },
        { members: req.user._id }
      ];
    }
    const teams = await Team.find(query)
      .populate("members", "name email role")
      .populate("manager", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   UPDATE TEAM
========================== */
const updateTeam = async (req, res) => {
  try {
    const { name, description, members, manager } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Only global admin, the team creator, or the team manager can update
    if (
      req.user.role !== "admin" &&
      String(team.createdBy) !== String(req.user._id) &&
      String(team.manager) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Not authorized to update this team" });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (members) team.members = members;
    if (manager !== undefined) team.manager = manager;

    const updated = await team.save();
    await updated.populate("members", "name email role");
    await updated.populate("manager", "name email role");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   DELETE TEAM
========================== */
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Only global admin or the team creator can delete the team
    if (
      req.user.role !== "admin" &&
      String(team.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Not authorized to delete this team" });
    }

    await team.deleteOne();

    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTeam,
  getTeams,
  updateTeam,
  deleteTeam,
};

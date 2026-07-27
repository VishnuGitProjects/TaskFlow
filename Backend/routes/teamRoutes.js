const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createTeam,
  getTeams,
  updateTeam,
  deleteTeam,
} = require("../controllers/teamController");

const router = express.Router();

router.route("/")
  .get(protect, getTeams)
  .post(protect, authorize("admin", "project_manager"), createTeam);

router.route("/:id")
  .put(protect, updateTeam)
  .delete(protect, deleteTeam);

module.exports = router;

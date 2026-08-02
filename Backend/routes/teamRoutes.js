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
  .post(protect, authorize("admin"), createTeam);

router.route("/:id")
  .put(protect, authorize("admin"), updateTeam)
  .delete(protect, authorize("admin"), deleteTeam);

module.exports = router;

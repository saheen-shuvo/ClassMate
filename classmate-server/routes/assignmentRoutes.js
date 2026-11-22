
const express = require("express");
const router = express.Router();

const {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require("../controllers/assignmentController");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");

router.get("/", requireAuth, getAssignments);
router.post("/", requireAuth, requireRoles("cr", "faculty", "admin"), createAssignment);
router.put("/:id", requireAuth, requireRoles("cr", "faculty", "admin"), updateAssignment);
router.delete("/:id", requireAuth, requireRoles("cr", "faculty", "admin"), deleteAssignment);

module.exports = router;

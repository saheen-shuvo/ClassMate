const express = require("express");

const {
  getPresentations,
  getPresentationById,
  getStudentPresentations,
  selectStudentPresentationTopic,
  createPresentation,
  deletePresentation,
  assignPresentationTopic,
  updatePresentationSettings,
  setPresentationTopicLocked,
  unassignPresentationTopic,
  submitPresentation,
} = require("../controllers/presentationController");

const router = express.Router();
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");

// Get all presentation groups
router.get("/", requireAuth, getPresentations);

router.get("/student", requireAuth, requireRoles("student"), getStudentPresentations);
router.put("/:id/topics/:topicIndex/select", requireAuth, requireRoles("student"), selectStudentPresentationTopic);

// Assign a presentation topic to a student
router.put("/:id/topics/:topicIndex/assign", requireAuth, requireRoles("cr", "faculty", "admin"), assignPresentationTopic);

// Update presentation selection limits
router.put("/:id/settings", requireAuth, requireRoles("cr", "faculty", "admin"), updatePresentationSettings);

// Lock or unlock a topic
router.put("/:id/topics/:topicIndex/lock", requireAuth, requireRoles("cr", "faculty", "admin"), setPresentationTopicLocked);

// Remove a student's topic selection
router.delete("/:id/topics/:topicIndex/unassign", requireAuth, requireRoles("cr", "faculty", "admin"), unassignPresentationTopic);

// Submit or replace a student's presentation
router.put("/:id/topics/:topicIndex/submit", requireAuth, requireRoles("student"), submitPresentation);

// Get one presentation group
router.get("/:id", requireAuth, getPresentationById);

// Create a presentation group
router.post("/", requireAuth, requireRoles("cr", "faculty", "admin"), createPresentation);

// Delete a presentation group
router.delete("/:id", requireAuth, requireRoles("cr", "faculty", "admin"), deletePresentation);

module.exports = router;

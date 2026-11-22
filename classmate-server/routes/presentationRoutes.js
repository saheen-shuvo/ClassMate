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

// Get all presentation groups
router.get("/", getPresentations);

router.get("/student", getStudentPresentations);
router.put("/:id/topics/:topicIndex/select", selectStudentPresentationTopic);

// Assign a presentation topic to a student
router.put("/:id/topics/:topicIndex/assign", assignPresentationTopic);

// Update presentation selection limits
router.put("/:id/settings", updatePresentationSettings);

// Lock or unlock a topic
router.put("/:id/topics/:topicIndex/lock", setPresentationTopicLocked);

// Remove a student's topic selection
router.delete("/:id/topics/:topicIndex/unassign", unassignPresentationTopic);

// Submit or replace a student's presentation
router.put("/:id/topics/:topicIndex/submit", submitPresentation);

// Get one presentation group
router.get("/:id", getPresentationById);

// Create a presentation group
router.post("/", createPresentation);

// Delete a presentation group
router.delete("/:id", deletePresentation);

module.exports = router;

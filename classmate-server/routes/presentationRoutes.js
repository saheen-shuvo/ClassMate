const express = require("express");

const {
  getPresentations,
  getPresentationById,
  createPresentation,
  deletePresentation,
  assignPresentationTopic,
} = require("../controllers/presentationController");

const router = express.Router();

// Get all presentation groups
router.get("/", getPresentations);

// Assign a presentation topic to a student
router.put("/:id/topics/:topicIndex/assign", assignPresentationTopic);

// Get one presentation group
router.get("/:id", getPresentationById);

// Create a presentation group
router.post("/", createPresentation);

// Delete a presentation group
router.delete("/:id", deletePresentation);

module.exports = router;

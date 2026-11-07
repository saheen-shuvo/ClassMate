
const express = require("express");

const {
  getPresentations,
  getPresentationById,
  createPresentation,
  deletePresentation,
} = require("../controllers/presentationController");

const router = express.Router();

// Get all presentation groups
router.get("/", getPresentations);

// Get one presentation group
router.get("/:id", getPresentationById);

// Create a presentation group
router.post("/", createPresentation);

// Delete a presentation group
router.delete("/:id", deletePresentation);

module.exports = router;

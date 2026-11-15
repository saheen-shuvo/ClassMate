
const express = require("express");

const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");

const router = express.Router();

// GET all announcements
router.get("/", getAnnouncements);

// POST new announcement
router.post("/", createAnnouncement);

// DELETE announcement by ID
router.delete("/:id", deleteAnnouncement);

module.exports = router;

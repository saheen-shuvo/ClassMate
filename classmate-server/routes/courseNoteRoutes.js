const express = require("express");
const {
  createCourseNote,
  deleteCourseNote,
  getCourseNotes,
  serveCourseNoteFile,
  updateCourseNote,
} = require("../controllers/courseNoteController");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");
const { handleCourseNoteUpload } = require("../middleware/courseNoteUpload");

const router = express.Router();
const noteManagers = requireRoles("cr", "admin");

router.get("/", requireAuth, getCourseNotes);
router.get("/:id/file", requireAuth, serveCourseNoteFile);
router.post("/", requireAuth, noteManagers, handleCourseNoteUpload, createCourseNote);
router.put("/:id", requireAuth, noteManagers, handleCourseNoteUpload, updateCourseNote);
router.delete("/:id", requireAuth, noteManagers, deleteCourseNote);

module.exports = router;

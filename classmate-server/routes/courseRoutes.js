const express = require("express");
const {
  addCourseStudent,
  createCourse,
  deleteCourse,
  getCourseById,
  getCourseStudents,
  getCourses,
  removeCourseStudent,
  updateCourse,
} = require("../controllers/courseController");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();
const adminOnly = requireRoles("admin");

router.get("/", requireAuth, getCourses);
router.post("/", requireAuth, adminOnly, createCourse);
router.get("/:id/students", requireAuth, requireRoles("admin", "faculty", "cr"), getCourseStudents);
router.post("/:id/students/:studentId", requireAuth, adminOnly, addCourseStudent);
router.delete("/:id/students/:studentId", requireAuth, adminOnly, removeCourseStudent);
router.get("/:id", requireAuth, getCourseById);
router.put("/:id", requireAuth, adminOnly, updateCourse);
router.delete("/:id", requireAuth, adminOnly, deleteCourse);

module.exports = router;

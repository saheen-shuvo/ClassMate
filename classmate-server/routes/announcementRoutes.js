const express = require("express");
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", requireAuth, requireRoles("cr", "faculty", "admin"), createAnnouncement);
router.put("/:id", requireAuth, requireRoles("cr", "faculty", "admin"), updateAnnouncement);
router.delete("/:id", requireAuth, requireRoles("cr", "faculty", "admin"), deleteAnnouncement);

module.exports = router;

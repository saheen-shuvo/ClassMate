const express = require("express");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");
const { getOverview, getUsers, createUser, updateUser } = require("../controllers/adminController");

const router = express.Router();

router.use(requireAuth, requireRoles("admin"));
router.get("/overview", getOverview);
router.get("/users", getUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);

module.exports = router;

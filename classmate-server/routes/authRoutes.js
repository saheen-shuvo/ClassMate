const express = require("express");
const { register, login, me, logout, updateProfile } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);
router.patch("/profile", requireAuth, updateProfile);

module.exports = router;

const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { safeUser } = require("../middleware/authMiddleware");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const register = async (req, res) => {
  try {
    const name = String(req.body.name || req.body.fullName || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const studentId = String(req.body.studentId || "").trim();

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Please enter a valid email address." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const db = getDB();
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      name,
      email,
      passwordHash,
      role: "student",
      studentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);
    const safe = safeUser({ ...user, _id: result.insertedId });
    res.status(201).json({ message: "Registration successful.", user: safe });
  } catch (error) {
    if (error?.code === 11000)
      return res.status(409).json({ message: "An account with this email already exists." });
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register account." });
  }
};

const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const db = getDB();
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });
    if (user.active === false)
      return res.status(403).json({ message: "This account has been disabled." });

    const passwordHash = user.passwordHash;
    if (!passwordHash || !(await bcrypt.compare(password, passwordHash)))
      return res.status(401).json({ message: "Invalid email or password." });

    req.session.userId = String(user._id);
    req.session.authVersion = Number(user.authVersion) || 0;
    req.session.save((error) => {
      if (error) {
        console.error("Session save error:", error);
        return res.status(500).json({ message: "Failed to create authenticated session." });
      }
      res.status(200).json({ message: "Login successful.", user: safeUser(user) });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to log in." });
  }
};

const me = async (req, res) => {
  res.status(200).json({ user: req.user });
};

const logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Session destroy error:", error);
      return res.status(500).json({ message: "Failed to log out." });
    }
    res.clearCookie("classmate.sid", {
      path: "/",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({ message: "Logged out successfully." });
  });
};

const updateProfile = async (req, res) => {
  try {
    const db = getDB();
    const updates = {};
    if (typeof req.body.name === "string" && req.body.name.trim())
      updates.name = req.body.name.trim();
    if (typeof req.body.studentId === "string")
      updates.studentId = req.body.studentId.trim();
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: "No valid profile updates supplied." });
    updates.updatedAt = new Date();

    await db.collection("users").updateOne(
      { _id: new ObjectId(req.user._id) },
      { $set: updates },
    );
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user._id) });
    res.status(200).json({ message: "Profile updated successfully.", user: safeUser(user) });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
};

module.exports = { register, login, me, logout, updateProfile, normalizeEmail };

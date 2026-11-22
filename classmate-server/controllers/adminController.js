const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { safeUser } = require("../middleware/authMiddleware");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getOverview = async (req, res) => {
  try {
    const db = getDB();
    const users = db.collection("users");

    const [totalUsers, students, faculty, crs, admins, recentUsers, announcements, assignments] =
      await Promise.all([
        users.countDocuments({}),
        users.countDocuments({ role: "student" }),
        users.countDocuments({ role: "faculty" }),
        users.countDocuments({ role: "cr" }),
        users.countDocuments({ role: "admin" }),
        users.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection("announcements").find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        db.collection("assignments").find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      ]);

    res.status(200).json({
      counts: { totalUsers, students, faculty, crs, admins },
      recentUsers: recentUsers.map(safeUser),
      recentAnnouncements: announcements,
      recentAssignments: assignments,
    });
  } catch (error) {
    console.error("Get admin overview error:", error);
    res.status(500).json({ message: "Failed to load admin overview." });
  }
};

const getUsers = async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json(users.map(safeUser));
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to load users." });
  }
};

const createUser = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").toLowerCase();
    const studentId = String(req.body.studentId || "").trim();

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email, and password are required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Please enter a valid email address." });
    if (!["student", "faculty", "cr", "admin"].includes(role))
      return res.status(400).json({ message: "Invalid account role." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const db = getDB();
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    if (await db.collection("users").findOne({ email }))
      return res.status(409).json({ message: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      name,
      email,
      passwordHash,
      role,
      studentId,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("users").insertOne(user);
    res.status(201).json({ message: "Account created successfully.", user: safeUser({ ...user, _id: result.insertedId }) });
  } catch (error) {
    if (error?.code === 11000)
      return res.status(409).json({ message: "An account with this email already exists." });
    console.error("Create admin user error:", error);
    res.status(500).json({ message: "Failed to create account." });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID." });

    const db = getDB();
    const existing = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).json({ message: "User not found." });

    if (String(existing._id) === req.user._id && req.body.role && req.body.role !== existing.role)
      return res.status(409).json({ message: "You cannot change your own role." });

    const updates = {};
    if (typeof req.body.name === "string" && req.body.name.trim())
      updates.name = req.body.name.trim();
    if (typeof req.body.email === "string") {
      const email = normalizeEmail(req.body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ message: "Please enter a valid email address." });
      updates.email = email;
    }
    if (typeof req.body.studentId === "string")
      updates.studentId = req.body.studentId.trim();
    if (typeof req.body.role === "string") {
      const role = req.body.role.toLowerCase();
      if (!["student", "faculty", "cr", "admin"].includes(role))
        return res.status(400).json({ message: "Invalid account role." });
      updates.role = role;
    }
    if (typeof req.body.active === "boolean")
      updates.active = req.body.active;
    if (typeof req.body.password === "string" && req.body.password.length > 0) {
      if (req.body.password.length < 8)
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    if (updates.email) {
      const duplicate = await db.collection("users").findOne({ email: updates.email, _id: { $ne: existing._id } });
      if (duplicate) return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: "No valid updates supplied." });

    updates.updatedAt = new Date();
    await db.collection("users").updateOne({ _id: existing._id }, { $set: updates });
    const updated = await db.collection("users").findOne({ _id: existing._id });
    res.status(200).json({ message: "Account updated successfully.", user: safeUser(updated) });
  } catch (error) {
    if (error?.code === 11000)
      return res.status(409).json({ message: "An account with this email already exists." });
    console.error("Update admin user error:", error);
    res.status(500).json({ message: "Failed to update account." });
  }
};

module.exports = { getOverview, getUsers, createUser, updateUser };

const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const safeUser = (user) => ({
  _id: String(user._id),
  name: user.name || user.fullName || "",
  email: user.email,
  role: user.role,
  studentId: user.studentId || "",
  createdAt: user.createdAt || null,
  active: user.active !== false,
});

const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const db = getDB();
    if (!ObjectId.isValid(req.session.userId)) {
      return res.status(401).json({ message: "Invalid authenticated session." });
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(req.session.userId) });
    if (!user) {
      return res.status(401).json({ message: "Authenticated user no longer exists." });
    }

    req.user = safeUser(user);
    next();
  } catch (error) {
    console.error("Load authenticated user error:", error);
    res.status(500).json({ message: "Failed to validate authenticated session." });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required." });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." });
  next();
};

module.exports = { requireAuth, requireRoles, safeUser };

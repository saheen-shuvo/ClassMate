
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "announcements";
const PRIORITIES = ["High", "Medium", "Low"];

const validateAnnouncement = (body = {}) => {
  const { title, description, course, priority } = body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof course !== "string" ||
    !course.trim() ||
    !PRIORITIES.includes(priority)
  ) {
    return null;
  }

  return {
    title: title.trim(),
    description: description.trim(),
    course: course.trim(),
    priority,
  };
};

const announcementAccessFilter = (id, user) => {
  const filter = { _id: new ObjectId(id) };

  if (user.role === "cr") {
    filter["createdBy._id"] = user._id;
    filter["createdBy.role"] = "cr";
  } else if (user.role === "faculty") {
    filter["createdBy.role"] = { $ne: "cr" };
  }

  return filter;
};

// GET: Fetch all announcements
const getAnnouncements = async (req, res) => {
  try {
    const db = getDB();

    const announcements = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(announcements);
  } catch (error) {
    console.error("Get announcements error:", error);

    res.status(500).json({
      message: "Failed to fetch announcements.",
    });
  }
};

// POST: Create a new announcement
const createAnnouncement = async (req, res) => {
  try {
    const details = validateAnnouncement(req.body);
    if (!details) {
      return res.status(400).json({
        message: "Please provide valid announcement details.",
      });
    }

    const now = new Date();
    const newAnnouncement = {
      ...details,
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      createdAt: now,
      updatedAt: now,
    };

    const db = getDB();
    const result = await db.collection(COLLECTION).insertOne(newAnnouncement);

    res.status(201).json({
      message: "Announcement published successfully.",
      announcement: {
        ...newAnnouncement,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create announcement error:", error);

    res.status(500).json({
      message: "Failed to create announcement.",
    });
  }
};

// PUT: Replace the editable announcement details while preserving its creator and creation date.
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid announcement ID." });
    }

    const details = validateAnnouncement(req.body);
    if (!details) {
      return res.status(400).json({
        message: "Please provide valid announcement details.",
      });
    }

    const db = getDB();
    const filter = announcementAccessFilter(id, req.user);
    const result = await db.collection(COLLECTION).updateOne(filter, {
      $set: { ...details, updatedAt: new Date() },
    });

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    const announcement = await db.collection(COLLECTION).findOne(filter);
    res.status(200).json({
      message: "Announcement updated successfully.",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({ message: "Failed to update announcement." });
  }
};

// DELETE: Delete an announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid announcement ID.",
      });
    }

    const result = await db
      .collection(COLLECTION)
      .deleteOne(announcementAccessFilter(id, req.user));

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Announcement not found.",
      });
    }

    res.status(200).json({
      message: "Announcement deleted successfully.",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);

    res.status(500).json({
      message: "Failed to delete announcement.",
    });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};

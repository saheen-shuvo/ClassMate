
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "announcements";

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
    const db = getDB();

    const { title, description, course, priority } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !course?.trim() ||
      !["High", "Medium", "Low"].includes(priority)
    ) {
      return res.status(400).json({
        message: "Please provide valid announcement details.",
      });
    }

    const newAnnouncement = {
      title: title.trim(),
      description: description.trim(),
      course: course.trim(),
      priority,
      createdAt: new Date(),
    };

    const result = await db
      .collection(COLLECTION)
      .insertOne(newAnnouncement);

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

    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

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
  deleteAnnouncement,
};

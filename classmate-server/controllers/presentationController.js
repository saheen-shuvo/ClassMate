
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "presentations";

// GET: Get all presentation groups
const getPresentations = async (req, res) => {
  try {
    const db = getDB();

    const presentations = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(presentations);
  } catch (error) {
    console.error("Get presentations error:", error);

    res.status(500).json({
      message: "Failed to fetch presentations.",
    });
  }
};

// GET: Get a single presentation group
const getPresentationById = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid presentation ID.",
      });
    }

    const presentation = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!presentation) {
      return res.status(404).json({
        message: "Presentation group not found.",
      });
    }

    res.status(200).json(presentation);
  } catch (error) {
    console.error("Get presentation error:", error);

    res.status(500).json({
      message: "Failed to fetch presentation.",
    });
  }
};

// POST: Create a presentation group
const createPresentation = async (req, res) => {
  try {
    const db = getDB();

    const {
      courseName,
      teammates,
      submissionDeadline,
      presentationDate,
      topics,
    } = req.body;

    if (
      !courseName?.trim() ||
      !teammates ||
      !submissionDeadline ||
      !presentationDate ||
      !Array.isArray(topics) ||
      topics.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    if (submissionDeadline > presentationDate) {
      return res.status(400).json({
        message: "Submission deadline cannot be after presentation date.",
      });
    }

    const normalizedName = courseName.trim().toLowerCase();

    const existing = await db.collection(COLLECTION).findOne({
      normalizedName,
    });

    if (existing) {
      return res.status(409).json({
        message: "A presentation group for this course already exists.",
      });
    }

    const newPresentation = {
      courseName: courseName.trim(),
      normalizedName,
      teammates: Number(teammates),
      submissionDeadline,
      presentationDate,
      createdAt: new Date(),

      topics: topics
        .map((topic) => ({
          title: String(topic).trim(),
          status: "available",
          selectedBy: null,
          submission: null,
        }))
        .filter((topic) => topic.title),
    };

    if (!newPresentation.topics.length) {
      return res.status(400).json({
        message: "Please add at least one valid topic.",
      });
    }

    const result = await db
      .collection(COLLECTION)
      .insertOne(newPresentation);

    res.status(201).json({
      message: "Presentation group created successfully.",
      presentation: {
        ...newPresentation,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create presentation error:", error);

    res.status(500).json({
      message: "Failed to create presentation group.",
    });
  }
};

// DELETE: Delete a presentation group
const deletePresentation = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid presentation ID.",
      });
    }

    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Presentation group not found.",
      });
    }

    res.status(200).json({
      message: "Presentation group deleted successfully.",
    });
  } catch (error) {
    console.error("Delete presentation error:", error);

    res.status(500).json({
      message: "Failed to delete presentation group.",
    });
  }
};

module.exports = {
  getPresentations,
  getPresentationById,
  createPresentation,
  deletePresentation,
};

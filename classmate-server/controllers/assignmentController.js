
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const COLLECTION = "assignments";

const getAssignments = async (req, res) => {
  try {
    const db = getDB();
    const assignments = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ message: "Failed to fetch assignments." });
  }
};

const createAssignment = async (req, res) => {
  try {
    const { title, description, instructions, course, dueDate, totalMarks } =
      req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !course?.trim() ||
      !dueDate ||
      totalMarks === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required assignment information.",
      });
    }

    const parsedMarks = Number(totalMarks);
    const parsedDueDate = new Date(dueDate);

    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      return res.status(400).json({
        message: "Total marks must be greater than zero.",
      });
    }

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date." });
    }

    const assignment = {
      title: title.trim(),
      description: description.trim(),
      instructions: (instructions || "").trim(),
      course: course.trim(),
      dueDate: parsedDueDate,
      totalMarks: parsedMarks,
      status: "Published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = getDB();
    const result = await db.collection(COLLECTION).insertOne(assignment);

    res.status(201).json({
      message: "Assignment created successfully.",
      assignment: { ...assignment, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ message: "Failed to create assignment." });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    const { title, description, instructions, course, dueDate, totalMarks } =
      req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !course?.trim() ||
      !dueDate ||
      totalMarks === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required assignment information.",
      });
    }

    const parsedMarks = Number(totalMarks);
    const parsedDueDate = new Date(dueDate);

    if (!Number.isFinite(parsedMarks) || parsedMarks <= 0) {
      return res.status(400).json({
        message: "Total marks must be greater than zero.",
      });
    }

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date." });
    }

    const updatedData = {
      title: title.trim(),
      description: description.trim(),
      instructions: (instructions || "").trim(),
      course: course.trim(),
      dueDate: parsedDueDate,
      totalMarks: parsedMarks,
      updatedAt: new Date(),
    };

    const db = getDB();
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    const updatedAssignment = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json({
      message: "Assignment updated successfully.",
      assignment: updatedAssignment,
    });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ message: "Failed to update assignment." });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid assignment ID." });
    }

    const db = getDB();
    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    res.status(200).json({
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ message: "Failed to delete assignment." });
  }
};

module.exports = {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};

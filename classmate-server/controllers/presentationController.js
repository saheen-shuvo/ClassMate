const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const {
  canManageLinkedCourse,
  canReadLinkedCourse,
  getLinkedCourse,
  resourceVisibilityFilter,
  resolveCourseForResourceWrite,
} = require("../utils/courseAccess");

const COLLECTION = "presentations";
const assignmentLocks = new Map();

const getStudentIdentity = (req) => {
  return req.user?.email?.trim().toLowerCase() || null;
};

const presentationAccessError = async (db, presentation, user, canManage = false) => {
  if (!presentation.courseId) return null;
  const course = await getLinkedCourse(db, presentation.courseId);
  const permitted = canManage
    ? canManageLinkedCourse(course, user)
    : canReadLinkedCourse(course, user);
  return permitted
    ? null
    : { status: course ? 403 : 404, message: "You do not have access to this course presentation." };
};

const acquireAssignmentLock = async (key) => {
  let lock = assignmentLocks.get(key);
  if (!lock) {
    lock = { locked: false, queue: [] };
    assignmentLocks.set(key, lock);
  }
  if (lock.locked) {
    await new Promise((resolve) => lock.queue.push(resolve));
  } else {
    lock.locked = true;
  }
  return () => {
    const next = lock.queue.shift();
    if (next) next();
    else {
      lock.locked = false;
      if (assignmentLocks.get(key) === lock) assignmentLocks.delete(key);
    }
  };
};

const normalizePresentation = (presentation) => {
  if (!presentation) return presentation;
  const maxStudentsPerTopic = Number.isInteger(presentation.maxStudentsPerTopic) && presentation.maxStudentsPerTopic >= 1
    ? presentation.maxStudentsPerTopic
    : 1;
  const topicCount = Array.isArray(presentation.topics) ? presentation.topics.length : 0;
  const maxTopicsPerStudent = 1;

  const topics = (presentation.topics || []).map((topic) => {
    let selections = Array.isArray(topic.selections) ? topic.selections.map((selection) => ({ ...selection })) : [];
    if (selections.length === 0 && topic.selectedBy?.id) {
      selections = [{
        id: topic.selectedBy.id,
        name: topic.selectedBy.name,
        selectedAt: topic.submission?.submittedAt || topic.selectedAt || null,
        submission: topic.submission || null,
      }];
    } else if (topic.submission) {
      const ownerId = topic.submission.studentId;
      selections = selections.map((selection) =>
        String(selection.id) === String(ownerId) && !selection.submission
          ? { ...selection, submission: topic.submission }
          : selection,
      );
    }

    const locked = topic.locked === true;
    const status = locked ? "locked" : selections.length >= maxStudentsPerTopic ? "full" : "available";
    return {
      ...topic,
      locked,
      selections,
      status,
      selectedBy: undefined,
      submission: undefined,
    };
  });

  return {
    ...presentation,
    maxStudentsPerTopic,
    maxTopicsPerStudent,
    topics,
  };
};

const addCourseInformation = async (db, presentations) => {
  const courseIds = [...new Set(
    presentations
      .map((presentation) => presentation.courseId)
      .filter((courseId) => ObjectId.isValid(String(courseId || "")))
      .map(String),
  )].map((id) => new ObjectId(id));

  const linkedCourses = courseIds.length
    ? await db.collection("courses").find(
        { _id: { $in: courseIds } },
        { projection: { courseCode: 1, title: 1, studentIds: 1 } },
      ).toArray()
    : [];
  const courseById = new Map(linkedCourses.map((course) => [String(course._id), course]));

  return presentations.map((presentation) => {
    const normalized = normalizePresentation(presentation);
    const linkedCourse = courseById.get(String(presentation.courseId));
    if (!linkedCourse) return normalized;
    return {
      ...normalized,
      courseCode: linkedCourse.courseCode,
      courseTitle: linkedCourse.title,
      enrollmentCount: (linkedCourse.studentIds || []).length,
    };
  });
};

const migratePresentations = async (db) => {
  const docs = await db.collection(COLLECTION).find({}).toArray();
  for (const presentation of docs) {
    const topicCount = Array.isArray(presentation.topics) ? presentation.topics.length : 0;
    const maxStudentsPerTopic =
      Number.isInteger(presentation.maxStudentsPerTopic) && presentation.maxStudentsPerTopic >= 1
        ? presentation.maxStudentsPerTopic
        : 1;
    const maxTopicsPerStudent = 1;

    const topics = (presentation.topics || []).map((topic) => {
      let selections = Array.isArray(topic.selections)
        ? topic.selections.filter((selection) => selection && selection.id)
        : [];
      if (topic.selectedBy?.id) {
        const oldId = String(topic.selectedBy.id);
        if (!selections.some((selection) => String(selection.id) === oldId)) {
          selections = [...selections, {
            id: oldId,
            name: topic.selectedBy.name || "",
            selectedAt: topic.submission?.submittedAt || topic.selectedAt || null,
            submission: topic.submission || null,
          }];
        }
      } else if (topic.submission?.studentId) {
        selections = selections.map((selection) =>
          String(selection.id) === String(topic.submission.studentId) && !selection.submission
            ? { ...selection, submission: topic.submission }
            : selection,
        );
      }

      const migrated = { ...topic, locked: topic.locked === true, selections };
      delete migrated.status;
      delete migrated.selectedBy;
      delete migrated.submission;
      return migrated;
    });

    await db.collection(COLLECTION).updateOne(
      { _id: presentation._id },
      { $set: { maxStudentsPerTopic, maxTopicsPerStudent, topics, selectionVersion: presentation.selectionVersion || 0 } },
    );
  }
};

// GET: Get all presentation groups
const getPresentations = async (req, res) => {
  try {
    const db = getDB();
    await migratePresentations(db);

    const filter = await resourceVisibilityFilter(db, req.user);
    const presentations = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(await addCourseInformation(db, presentations));
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

    await migratePresentations(db);
    const presentation = await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!presentation) {
      return res.status(404).json({
        message: "Presentation group not found.",
      });
    }
    const accessError = await presentationAccessError(db, presentation, req.user);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });

    res.status(200).json((await addCourseInformation(db, [presentation]))[0]);
  } catch (error) {
    console.error("Get presentation error:", error);

    res.status(500).json({
      message: "Failed to fetch presentation.",
    });
  }
};

// GET: Get presentation groups without exposing other students' identities.
const getStudentPresentations = async (req, res) => {
  try {
    const studentId = getStudentIdentity(req);
    if (!studentId) return res.status(401).json({ message: "Student authentication is required." });

    const db = getDB();
    await migratePresentations(db);
    const filter = await resourceVisibilityFilter(db, req.user);
    const presentations = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();

    const enrichedPresentations = await addCourseInformation(db, presentations);
    res.status(200).json(enrichedPresentations.map((normalized) => {
      return {
        ...normalized,
        topics: normalized.topics.map((topic, index) => {
          const selection = topic.selections.find((item) => String(item.id) === studentId);
          return {
            ...topic,
            index,
            selections: undefined,
            selectionCount: topic.selections.length,
            selectedByCurrentStudent: Boolean(selection),
            selectedAt: selection?.selectedAt || null,
          };
        }),
      };
    }));
  } catch (error) {
    console.error("Get student presentations error:", error);
    res.status(500).json({ message: "Failed to fetch student presentations." });
  }
};

// PUT: Atomically reserve a topic for the authenticated student.
const selectStudentPresentationTopic = async (req, res) => {
  try {
    const studentId = getStudentIdentity(req);
    if (!studentId) return res.status(401).json({ message: "Student authentication is required." });

    const { id, topicIndex } = req.params;
    const index = Number(topicIndex);
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid presentation ID." });
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ message: "Invalid topic index." });

    const db = getDB();
    const studentLockKey = `${id}:student:${studentId}`;
    const topicLockKey = `${id}:topic:${index}`;
    const releaseStudentLock = await acquireAssignmentLock(studentLockKey);
    const releaseTopicLock = await acquireAssignmentLock(topicLockKey);
    try {
      await migratePresentations(db);
      const presentation = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
      if (!presentation) return res.status(404).json({ message: "Presentation group not found." });
      const accessError = await presentationAccessError(db, presentation, req.user);
      if (accessError) return res.status(accessError.status).json({ message: accessError.message });

      const normalized = normalizePresentation(presentation);
      const topic = normalized.topics[index];
      if (!topic) return res.status(404).json({ message: "Topic not found." });
      if (topic.locked) return res.status(409).json({ message: "Topic is locked." });
      if (topic.selections.length >= normalized.maxStudentsPerTopic)
        return res.status(409).json({ message: "Topic is unavailable." });
      if (topic.selections.some((selection) => String(selection.id) === studentId))
        return res.status(409).json({ message: "You already selected this topic." });

      const currentSelections = normalized.topics.reduce(
        (count, item) => count + item.selections.filter((selection) => String(selection.id) === studentId).length,
        0,
      );
      if (currentSelections >= 1)
        return res.status(409).json({ message: "You have reached the topic selection limit for this group." });

      const result = await db.collection(COLLECTION).updateOne(
        {
          _id: new ObjectId(id),
          selectionVersion: presentation.selectionVersion || 0,
          [`topics.${index}.locked`]: { $ne: true },
          [`topics.${index}.selections.id`]: { $ne: studentId },
          "topics.selections.id": { $ne: studentId },
          $expr: {
            $lt: [
              { $size: { $ifNull: [`$topics.${index}.selections`, []] } },
              normalized.maxStudentsPerTopic,
            ],
          },
        },
        {
          $inc: { selectionVersion: 1 },
          $push: {
            [`topics.${index}.selections`]: {
              id: studentId,
              name: studentId,
              selectedAt: new Date(),
              submission: null,
            },
          },
        },
      );
      if (result.matchedCount === 0) return res.status(409).json({ message: "Topic is no longer available." });
    } finally {
      releaseTopicLock();
      releaseStudentLock();
    }

    const updated = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    const selectedTopic = normalizePresentation(updated).topics[index];
    const selection = selectedTopic.selections.find((item) => String(item.id) === studentId);
    res.status(200).json({
      message: "Topic selected successfully.",
      selection: {
        presentationId: id,
        topicIndex: index,
        topicTitle: selectedTopic.title,
        selectedAt: selection?.selectedAt || null,
      },
    });
  } catch (error) {
    console.error("Select student presentation topic error:", error);
    res.status(500).json({ message: "Failed to select presentation topic." });
  }
};

// POST: Create a presentation group
const createPresentation = async (req, res) => {
  try {
    const db = getDB();

    const {
      courseId,
      teammates,
      submissionDeadline,
      presentationDate,
      topics,
      maxStudentsPerTopic = 1,
      maxTopicsPerStudent = 1,
    } = req.body;

    if (
      !courseId ||
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

    if (!Number.isInteger(maxStudentsPerTopic) || maxStudentsPerTopic < 1)
      return res.status(400).json({ message: "maxStudentsPerTopic must be an integer of at least 1." });
    if (!Number.isInteger(maxTopicsPerStudent) || maxTopicsPerStudent < 1)
      return res.status(400).json({ message: "maxTopicsPerStudent must be an integer of at least 1." });
    if (!Array.isArray(topics) || topics.length < 1 || topics.length > 10)
      return res.status(400).json({ message: "Please provide between 1 and 10 topics." });

    const resolved = await resolveCourseForResourceWrite(db, req.user, courseId);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const course = resolved.course;
    const courseName = `${course.courseCode} - ${course.title}`;
    const normalizedName = course.courseCode.toLowerCase();

    const existing = await db.collection(COLLECTION).findOne({
      courseId: course._id,
    });

    if (existing) {
      return res.status(409).json({
        message: "A presentation group for this course already exists.",
      });
    }

    const newPresentation = {
      courseId: course._id,
      courseName,
      normalizedName,
      teammates: Number(teammates),
      submissionDeadline,
      presentationDate,
      maxStudentsPerTopic,
      maxTopicsPerStudent: 1,
      createdAt: new Date(),

      topics: topics
        .map((topic) => ({
          title: String(topic).trim(),
          locked: false,
          selections: [],
        }))
        .filter((topic) => topic.title),
    };

    if (!newPresentation.topics.length) {
      return res.status(400).json({
        message: "Please add at least one valid topic.",
      });
    }

    const result = await db.collection(COLLECTION).insertOne(newPresentation);

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

// PUT: Assign an available topic to a student
const assignPresentationTopic = async (req, res) => {
  try {
    const db = getDB();
    const { id, topicIndex } = req.params;
    const { selectedBy } = req.body;

    const index = Number(topicIndex);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid presentation ID.",
      });
    }

    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({
        message: "Invalid topic index.",
      });
    }

    if (!selectedBy?.name?.trim() || !selectedBy?.id?.trim()) {
      return res.status(400).json({
        message: "Student name and ID are required.",
      });
    }

    await migratePresentations(db);

    let studentId = String(selectedBy.id).trim();
    let studentName = selectedBy.name.trim();
    const courseObjectId = new ObjectId(id);
    const lockKey = `${id}:${index}`;
    const releaseLock = await acquireAssignmentLock(lockKey);
    try {
      await migratePresentations(db);
      const course = await db.collection(COLLECTION).findOne({ _id: courseObjectId });
      if (!course) return res.status(404).json({ message: "Presentation group not found." });
      const accessError = await presentationAccessError(db, course, req.user, true);
      if (accessError) return res.status(accessError.status).json({ message: accessError.message });
      if (course.courseId) {
        const academicCourse = await getLinkedCourse(db, course.courseId);
        const studentFilter = ObjectId.isValid(studentId)
          ? { _id: new ObjectId(studentId), role: "student", active: { $ne: false } }
          : { email: studentId.toLowerCase(), role: "student", active: { $ne: false } };
        const enrolledStudent = await db.collection("users").findOne(studentFilter);
        if (
          !enrolledStudent ||
          !(academicCourse.studentIds || []).some((id) => String(id) === String(enrolledStudent._id))
        ) {
          return res.status(403).json({ message: "Select a student enrolled in this course." });
        }
        studentId = enrolledStudent.email.trim().toLowerCase();
        studentName = enrolledStudent.name || "";
      }
      const topic = course.topics?.[index];
      if (!topic) return res.status(400).json({ message: "Invalid topic index." });
      const normalized = normalizePresentation(course);
      const selections = topic.selections || [];

      if (topic.locked === true)
        return res.status(409).json({ message: "Topic is locked" });
      if (selections.length >= normalized.maxStudentsPerTopic)
        return res.status(409).json({ message: "Topic is full" });
      if (selections.some((selection) => String(selection.id) === studentId))
        return res.status(409).json({ message: "Student already selected this topic" });

      let heldCount = 0;
      normalized.topics.forEach((item) => {
        if ((item.selections || []).some((selection) => String(selection.id) === studentId)) heldCount += 1;
      });
      if (heldCount >= normalized.maxTopicsPerStudent)
        return res.status(409).json({ message: `Student reached the limit of ${normalized.maxTopicsPerStudent} topics` });

      const result = await db.collection(COLLECTION).updateOne(
        {
          _id: courseObjectId,
          selectionVersion: course.selectionVersion || 0,
          [`topics.${index}.locked`]: { $ne: true },
          [`topics.${index}.selections.id`]: { $ne: studentId },
          "topics.selections.id": { $ne: studentId },
          $expr: {
            $lt: [
              { $size: { $ifNull: [`$topics.${index}.selections`, []] } },
              normalized.maxStudentsPerTopic,
            ],
          },
        },
        {
          $inc: { selectionVersion: 1 },
          $push: {
            [`topics.${index}.selections`]: {
              id: studentId,
              name: studentName,
              selectedAt: new Date(),
              submission: null,
            },
          },
        },
      );
      if (result.matchedCount === 0)
        return res.status(409).json({ message: "Topic is unavailable" });
    } finally {
      releaseLock();
    }

    res.status(200).json({
      message: "Topic assigned successfully.",
    });
  } catch (error) {
    console.error("Assign presentation topic error:", error);

    res.status(500).json({
      message: "Failed to assign presentation topic.",
    });
  }
};

// PUT: Update selection limits for a presentation group
const updatePresentationSettings = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { maxStudentsPerTopic } = req.body;

    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid presentation ID." });
    if (!Number.isInteger(maxStudentsPerTopic) || maxStudentsPerTopic < 1)
      return res.status(400).json({ message: "maxStudentsPerTopic must be an integer of at least 1." });
    await migratePresentations(db);
    const course = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!course) return res.status(404).json({ message: "Presentation group not found." });
    const accessError = await presentationAccessError(db, course, req.user, true);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });
    const normalized = normalizePresentation(course);

    const maxTopicsPerStudent = 1;

    const highestTopicFill = normalized.topics.reduce(
      (highest, topic) => Math.max(highest, (topic.selections || []).length),
      0,
    );
    if (maxStudentsPerTopic < highestTopicFill)
      return res.status(409).json({
        message: `Cannot lower maxStudentsPerTopic below ${highestTopicFill}; it is the highest current topic fill.`,
      });

    const heldCounts = new Map();
    normalized.topics.forEach((topic) => {
      (topic.selections || []).forEach((selection) => {
        const key = String(selection.id);
        heldCounts.set(key, (heldCounts.get(key) || 0) + 1);
      });
    });
    const highestStudentTopics = Math.max(0, ...heldCounts.values());
    if (maxTopicsPerStudent < highestStudentTopics)
      return res.status(409).json({
        message: `Cannot lower maxTopicsPerStudent below ${highestStudentTopics}; a student already holds that many topics.`,
      });

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: { maxStudentsPerTopic, maxTopicsPerStudent } },
    );
    res.status(200).json({ message: "Presentation settings updated successfully.", maxStudentsPerTopic, maxTopicsPerStudent });
  } catch (error) {
    console.error("Update presentation settings error:", error);
    res.status(500).json({ message: "Failed to update presentation settings." });
  }
};

// PUT: Lock or unlock a topic
const setPresentationTopicLocked = async (req, res) => {
  try {
    const db = getDB();
    const { id, topicIndex } = req.params;
    const index = Number(topicIndex);
    const locked = req.body.locked === true;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid presentation ID." });
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ message: "Invalid topic index." });

    await migratePresentations(db);
    const presentation = await db.collection(COLLECTION).findOne({
      _id: new ObjectId(id),
    });
    if (!presentation) return res.status(404).json({ message: "Presentation group not found." });
    const accessError = await presentationAccessError(db, presentation, req.user, true);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });

    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), [`topics.${index}`]: { $exists: true } },
      { $set: { [`topics.${index}.locked`]: locked } },
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: "Presentation or topic not found." });
    res.status(200).json({ message: locked ? "Topic locked successfully." : "Topic unlocked successfully." });
  } catch (error) {
    console.error("Lock presentation topic error:", error);
    res.status(500).json({ message: "Failed to update topic lock." });
  }
};

// DELETE: Remove one student's selection from a topic
const unassignPresentationTopic = async (req, res) => {
  try {
    const db = getDB();
    const { id, topicIndex } = req.params;
    const { studentId, confirm } = req.body;
    const index = Number(topicIndex);
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid presentation ID." });
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ message: "Invalid topic index." });
    if (!studentId?.toString().trim()) return res.status(400).json({ message: "Student ID is required." });

    await migratePresentations(db);
    const course = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!course) return res.status(404).json({ message: "Presentation group not found." });
    const accessError = await presentationAccessError(db, course, req.user, true);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });
    const topic = course.topics?.[index];
    if (!topic) return res.status(404).json({ message: "Topic not found." });
    const selection = (topic.selections || []).find((item) => String(item.id) === String(studentId).trim());
    if (!selection) return res.status(404).json({ message: "Student is not assigned to this topic." });
    if (selection.submission && confirm !== true)
      return res.status(409).json({ message: "This selection has a submission. Confirm to clear it." });

    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), [`topics.${index}.selections.id`]: String(studentId).trim() },
      { $pull: { [`topics.${index}.selections`]: { id: String(studentId).trim() } } },
    );
    res.status(200).json({ message: "Student selection removed successfully." });
  } catch (error) {
    console.error("Unassign presentation topic error:", error);
    res.status(500).json({ message: "Failed to remove student selection." });
  }
};

// PUT: Store or replace a student's submission on their selection
const submitPresentation = async (req, res) => {
  try {
    const db = getDB();
    const { id, topicIndex } = req.params;
    const { studentName, fileName, fileUrl } = req.body;
    const index = Number(topicIndex);
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid presentation ID." });
    if (!Number.isInteger(index) || index < 0) return res.status(400).json({ message: "Invalid topic index." });
    const studentId = req.user.email;

    await migratePresentations(db);
    const presentation = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!presentation) return res.status(404).json({ message: "Presentation group not found." });
    const accessError = await presentationAccessError(db, presentation, req.user);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });

    const submission = {
      studentId: String(studentId).trim(),
      submittedBy: studentName?.trim() || "",
      fileName: fileName || "",
      fileUrl: fileUrl || "",
      submittedAt: new Date(),
    };
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id), [`topics.${index}.selections.id`]: String(studentId).trim() },
      { $set: { [`topics.${index}.selections.$[selection].submission`]: submission } },
      { arrayFilters: [{ "selection.id": String(studentId).trim() }] },
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: "Student is not assigned to this topic." });
    res.status(200).json({ message: "Presentation submitted successfully." });
  } catch (error) {
    console.error("Submit presentation error:", error);
    res.status(500).json({ message: "Failed to submit presentation." });
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

    const existing = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).json({ message: "Presentation group not found." });
    const accessError = await presentationAccessError(db, existing, req.user, true);
    if (accessError) return res.status(accessError.status).json({ message: accessError.message });
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

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
  getStudentPresentations,
  selectStudentPresentationTopic,
  createPresentation,
  deletePresentation,
  assignPresentationTopic,
  updatePresentationSettings,
  setPresentationTopicLocked,
  unassignPresentationTopic,
  submitPresentation,
};

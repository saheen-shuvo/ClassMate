const assert = require("node:assert/strict");
const test = require("node:test");
const { ObjectId } = require("mongodb");
const { resourceVisibilityFilter } = require("./courseAccess");

const getPath = (value, path) =>
  path.split(".").reduce((current, part) => current?.[part], value);

const equalMongoValues = (left, right) => {
  if (left instanceof ObjectId || right instanceof ObjectId) {
    return String(left) === String(right);
  }
  return left === right;
};

const matchesMongoQuery = (document, query) =>
  Object.entries(query).every(([field, condition]) => {
    if (field === "$or") {
      return condition.some((clause) => matchesMongoQuery(document, clause));
    }

    const value = getPath(document, field);
    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
      if (Object.hasOwn(condition, "$exists")) {
        return (value !== undefined) === condition.$exists;
      }
      if (Object.hasOwn(condition, "$in")) {
        return condition.$in.some((candidate) =>
          Array.isArray(value)
            ? value.some((entry) => equalMongoValues(entry, candidate))
            : equalMongoValues(value, candidate),
        );
      }
    }

    if (condition === null) return value === null || value === undefined;
    return equalMongoValues(value, condition);
  });

const createMockDb = (collections) => ({
  collection(name) {
    const documents = collections[name] || [];
    return {
      find(query, options = {}) {
        return {
          async toArray() {
            const results = documents.filter((document) => matchesMongoQuery(document, query));
            if (!options.projection) return results;
            return results.map((document) =>
              Object.fromEntries(
                Object.entries(options.projection)
                  .filter(([, include]) => include)
                  .map(([field]) => [field, getPath(document, field)]),
              ),
            );
          },
        };
      },
    };
  },
});

const facultyId = new ObjectId();
const courseId = new ObjectId();
const faculty = { _id: facultyId, role: "faculty" };
const activeCourse = {
  _id: courseId,
  courseCode: "BIO 101",
  title: "Introduction to Biology",
  facultyId,
  status: "active",
};

const filterLegacyResources = async (courses, resources) => {
  const db = createMockDb({ courses, assignments: resources });
  const filter = await resourceVisibilityFilter(db, faculty, {
    collectionName: "assignments",
    legacyLabelFields: ["course"],
  });
  const visible = await db.collection("assignments").find(filter).toArray();
  return { filter, visible };
};

test("resourceVisibilityFilter exposes an unambiguous legacy course match to its member", async () => {
  const legacyResource = { _id: new ObjectId(), course: " BIO   101 " };
  const { visible } = await filterLegacyResources([activeCourse], [legacyResource]);

  assert.deepEqual(visible.map(({ _id }) => _id), [legacyResource._id]);
});

test("resourceVisibilityFilter hides unmatched legacy resources", async () => {
  const legacyResource = { _id: new ObjectId(), course: "MATH 100" };
  const { visible } = await filterLegacyResources([activeCourse], [legacyResource]);

  assert.deepEqual(visible, []);
});

test("resourceVisibilityFilter hides ambiguous legacy course matches", async () => {
  const duplicateCourse = {
    ...activeCourse,
    _id: new ObjectId(),
    title: "Biology Foundations",
  };
  const legacyResource = { _id: new ObjectId(), course: "BIO 101" };
  const { visible } = await filterLegacyResources(
    [activeCourse, duplicateCourse],
    [legacyResource],
  );

  assert.deepEqual(visible, []);
});

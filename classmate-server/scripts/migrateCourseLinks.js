require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");

const RESOURCE_COLLECTIONS = [
  { collection: "assignments", labelFields: ["course"] },
  { collection: "courseNotes", labelFields: ["course"] },
  { collection: "presentations", labelFields: ["courseName"] },
];

const normalize = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, " ");

const getCourseLabels = (course) => [
  course.courseCode,
  course.title,
  `${course.courseCode} - ${course.title}`,
].map(normalize);

const main = async () => {
  if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
    throw new Error("MONGODB_URI and DB_NAME must be configured.");
  }
  const apply = process.argv.includes("--apply");
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const courses = await db.collection("courses").find({}).toArray();
    const summary = { mode: apply ? "apply" : "dry-run", linked: 0, unmatched: 0, ambiguous: 0 };

    for (const resource of RESOURCE_COLLECTIONS) {
      const records = await db.collection(resource.collection).find({
        $or: [
          { courseId: { $exists: false } },
          { courseId: null },
        ],
      }).toArray();

      for (const record of records) {
        const labels = resource.labelFields.map((field) => normalize(record[field])).filter(Boolean);
        const matches = courses.filter((course) =>
          labels.some((label) => getCourseLabels(course).includes(label)),
        );
        if (matches.length !== 1) {
          summary[matches.length ? "ambiguous" : "unmatched"] += 1;
          continue;
        }

        const course = matches[0];
        console.log(`${apply ? "Linking" : "Would link"} ${resource.collection}/${record._id} -> ${course.courseCode} ${course._id}`);
        if (apply) {
          await db.collection(resource.collection).updateOne(
            { _id: new ObjectId(record._id), $or: [{ courseId: { $exists: false } }, { courseId: null }] },
            { $set: { courseId: course._id } },
          );
        }
        summary.linked += 1;
      }
    }

    console.log(JSON.stringify(summary, null, 2));
    if (!apply) console.log("Dry run only. Pass --apply to write unambiguous links.");
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error("Course-link migration failed:", error.message);
  process.exitCode = 1;
});

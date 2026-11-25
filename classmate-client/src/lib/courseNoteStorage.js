const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const COURSE_NOTES_URL = `${API_URL}/api/course-notes`;

const request = async (url, options = {}) => {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(data.message || "Course note request failed.");
  }

  return data;
};

const buildNoteForm = (details, file) => {
  const body = new FormData();
  body.append("title", details.title);
  body.append("description", details.description);
  body.append("course", details.course);
  if (file) body.append("file", file);
  return body;
};

export const getCourseNotes = () => request(COURSE_NOTES_URL);

export const createCourseNote = (details, file) =>
  request(COURSE_NOTES_URL, {
    method: "POST",
    body: buildNoteForm(details, file),
  });

export const updateCourseNote = (id, details, file) =>
  request(`${COURSE_NOTES_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: buildNoteForm(details, file),
  });

export const deleteCourseNote = (id) =>
  request(`${COURSE_NOTES_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const getCourseNoteFileUrl = (id, download = false) =>
  `${COURSE_NOTES_URL}/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;

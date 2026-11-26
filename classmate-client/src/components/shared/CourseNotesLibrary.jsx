"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { getCourses } from "@/lib/courseStorage";
import {
  createCourseNote,
  deleteCourseNote,
  getCourseNoteFileUrl,
  getCourseNotes,
  updateCourseNote,
} from "@/lib/courseNoteStorage";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const EMPTY_FORM = { title: "", description: "", courseId: "" };

function formatNote(note) {
  const createdAt = note.createdAt ? new Date(note.createdAt) : null;
  const fileSize = Number(note.fileSize || 0);
  return {
    ...note,
    id: String(note.id || note._id),
    date:
      createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "Date unavailable",
    size:
      fileSize < 1024 * 1024
        ? `${Math.max(1, Math.round(fileSize / 1024))} KB`
        : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`,
  };
}

export default function CourseNotesLibrary({
  canManage = false,
  hidden = false,
  managerUserId = null,
  onNotesChange,
}) {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseError, setCourseError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const loadNotes = useCallback(async () => {
    try {
      const data = await getCourseNotes();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected course notes response.");
      }
      const formattedNotes = data.map(formatNote);
      setNotes(formattedNotes);
      onNotesChange?.(formattedNotes);
      setError("");
    } catch (requestError) {
      console.error("Fetch course notes error:", requestError);
      setError(requestError.message || "Failed to load course notes.");
      setNotes([]);
      onNotesChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [onNotesChange]);

  useEffect(() => {
    void Promise.resolve().then(loadNotes);
  }, [loadNotes]);

  const loadCourses = useCallback(async () => {
    try {
      const data = await getCourses();
      if (!Array.isArray(data)) throw new Error("Unexpected courses response.");
      setCourses(data.filter((course) => course.status === "active"));
      setCourseError("");
    } catch (requestError) {
      console.error("Fetch course-note courses error:", requestError);
      setCourseError(requestError.message || "Failed to load assigned courses.");
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    if (canManage) void Promise.resolve().then(loadCourses);
  }, [canManage, loadCourses]);

  useEffect(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [modalOpen, editingNote]);

  const openCreate = () => {
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (note) => {
    const matchedCourse = courses.find((course) =>
      course._id === note.courseId ||
      course.courseCode.toLowerCase() === String(note.course || "").toLowerCase()
    );
    setEditingNote(note);
    setForm({
      title: note.title || "",
      description: note.description || "",
      courseId: matchedCourse?._id || "",
    });
    setSelectedFile(null);
    setFormError("");
    setModalOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
    ) {
      event.target.value = "";
      setSelectedFile(null);
      setFormError("Choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      event.target.value = "";
      setSelectedFile(null);
      setFormError("PDF files must be 15 MB or smaller.");
      return;
    }

    setFormError("");
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage || saving) return;

    if (!form.title.trim() || !form.courseId) {
      setFormError("Please provide a note title and course.");
      return;
    }
    if (!editingNote && !selectedFile) {
      setFormError("Choose a PDF file to upload.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const details = {
        title: form.title.trim(),
        description: form.description.trim(),
        courseId: form.courseId,
      };
      const response = editingNote
        ? await updateCourseNote(editingNote.id, details, selectedFile)
        : await createCourseNote(details, selectedFile);

      setModalOpen(false);
      setEditingNote(null);
      setSelectedFile(null);
      setForm(EMPTY_FORM);
      setNotice(response.warning || response.message);
      await loadNotes();
    } catch (requestError) {
      console.error("Save course note error:", requestError);
      setFormError(requestError.message || "Failed to save course note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete course note?",
      text: "The note and its PDF will be permanently deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!result.isConfirmed || deletingId) return;

    try {
      setDeletingId(note.id);
      const response = await deleteCourseNote(note.id);
      setNotice(response.message);
      await loadNotes();
    } catch (requestError) {
      console.error("Delete course note error:", requestError);
      setError(requestError.message || "Failed to delete course note.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      note.title?.toLowerCase().includes(query) ||
      note.course?.toLowerCase().includes(query) ||
      note.description?.toLowerCase().includes(query)
    );
  });
  const canManageNote = (note) =>
    canManage && (!managerUserId || note.uploadedBy?._id === managerUserId);

  return (
    <section className="space-y-5" hidden={hidden}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Notes & Materials</h2>
          <p className="mt-1 text-xs text-slate-500">
            {canManage
              ? "Upload and manage course learning resources."
              : "Browse course learning resources and PDF files."}
          </p>
        </div>
        {canManage && courses.length > 0 && (
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Upload Note
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
          {notice}
        </div>
      )}
      {canManage && courseError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {courseError}
        </div>
      )}

      <div className="relative w-full sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes or courses..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          <RefreshCw size={18} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-3">Loading course notes...</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-700">
          <p>{error}</p>
          <button onClick={loadNotes} className="mt-3 font-bold underline">
            Try again
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            {notes.length ? "No matching notes" : "No course notes yet"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {notes.length
              ? "Try another search term."
              : canManage
                ? "Upload a PDF to add the first course note."
                : "Shared course materials will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={21} />
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(note)}
                      aria-label={`Edit ${note.title}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(note)}
                      disabled={deletingId === note.id}
                      aria-label={`Delete ${note.title}`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="mt-4 break-words text-sm font-bold text-slate-900">{note.title}</h3>
              <p className="mt-2 text-xs text-slate-500">
                {note.courseTitle
                  ? `${note.courseCode || note.course} - ${note.courseTitle}`
                  : note.course} · {note.date}
              </p>
              {note.description && (
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                  {note.description}
                </p>
              )}
              <p className="mt-3 truncate text-[11px] text-slate-400" title={note.originalFileName}>
                {note.originalFileName}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400">{note.size}</span>
                <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
                  PDF
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={getCourseNoteFileUrl(note.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <ExternalLink size={14} /> Open PDF
                </a>
                <a
                  href={getCourseNoteFileUrl(note.id, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && canManage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="my-auto max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingNote ? "Edit Course Note" : "Upload Course Note"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {editingNote ? "Replace the PDF optionally." : "Choose a PDF up to 15 MB."}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                aria-label="Close note form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-700">
              Course
              <select
                required
                value={form.courseId}
                onChange={(event) => setForm({ ...form, courseId: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              >
                <option value="">Select an assigned active course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.courseCode} - {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Note title
              <input
                required
                maxLength={150}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              PDF file {editingNote ? "(optional replacement)" : ""}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                required={!editingNote}
                onChange={handleFileChange}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
              />
              <span className="mt-1 block text-[11px] font-normal text-slate-400">
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : editingNote
                    ? `Current PDF: ${editingNote.originalFileName}`
                    : "PDF only, up to 15 MB."}
              </span>
            </label>

            {formError && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {saving ? "Saving..." : editingNote ? "Save Changes" : "Upload Note"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

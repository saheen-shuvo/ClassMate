/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  Plus,
  Search,
  Presentation,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Trash2,
  X,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

import {
  getPresentationCourses,
  createPresentationCourse,
  deletePresentationCourse,
} from "@/lib/presentationStorage";
import { getCourses } from "@/lib/courseStorage";
import { presentationStudents as legacyPresentationStudents } from "@/lib/presentationStudents";

const EMPTY_FORM = {
  courseId: "",
  teammates: "5",
  submissionDeadline: "",
  presentationDate: "",
  topics: [""],
  maxStudentsPerTopic: "1",
  maxTopicsPerStudent: "1",
};

const MAX_TOPICS = 10;

const today = () => new Date().toISOString().split("T")[0];

const formatDay = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getTopicStatus = (course, topic) => {
  if (topic.locked === true) return "locked";
  const selections = topic.selections || (topic.selectedBy ? [topic.selectedBy] : []);
  const limit = Number(course?.maxStudentsPerTopic) || 1;
  if (selections.length >= limit) return "full";
  return "available";
};

const countByStatus = (course, status) =>
  (course.topics || []).filter((topic) => getTopicStatus(course, topic) === status).length;

export default function PresentationComponent({ dashboardPath = "/dashboard/cr" }) {
  const [courses, setCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getPresentationCourses();
      setCourses(data || []);
    } catch (err) {
      console.error("Failed to load presentations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCourses = async () => {
    try {
      setAvailableCourses(await getCourses({ status: "active" }));
    } catch (err) {
      console.error("Failed to load assigned courses:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadCourses();
    loadAvailableCourses();
  }, []);

  /* ───── Form helpers ───── */

  const openModal = () => {
    setError("");
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleTopicChange = (index, value) => {
    const topics = [...form.topics];
    topics[index] = value;
    setForm({ ...form, topics });
  };

  const addTopic = () => {
    if (form.topics.length >= MAX_TOPICS) return;
    setForm({ ...form, topics: [...form.topics, ""] });
  };

  const removeTopic = (index) => {
    if (form.topics.length <= 1) return;
    setForm({ ...form, topics: form.topics.filter((_, i) => i !== index) });
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError("");

    const validTopics = form.topics.map((t) => t.trim()).filter(Boolean);
    const teammates = Number(form.teammates);
    const maxStudentsPerTopic = Number(form.maxStudentsPerTopic);
    const maxTopicsPerStudent = Number(form.maxTopicsPerStudent);

    if (!form.courseId) return setError("Please select an assigned course.");
    if (!Number.isInteger(teammates) || teammates < 1 || teammates > 20)
      return setError("Teammates must be a whole number between 1 and 20.");
    if (!form.submissionDeadline) return setError("Please select a submission deadline.");
    if (!form.presentationDate) return setError("Please select a presentation date.");
    if (form.submissionDeadline > form.presentationDate)
      return setError("Submission deadline cannot be after the presentation date.");
    if (!validTopics.length) return setError("Please add at least one topic.");
    if (new Set(validTopics.map((t) => t.toLowerCase())).size !== validTopics.length)
      return setError("Duplicate topics are not allowed.");
    if (!Number.isInteger(maxStudentsPerTopic) || maxStudentsPerTopic < 1)
      return setError("Max students per topic must be a whole number of at least 1.");
    if (!Number.isInteger(maxTopicsPerStudent) || maxTopicsPerStudent < 1)
      return setError("Max topics per student must be a whole number of at least 1.");
    if (maxTopicsPerStudent > validTopics.length)
      return setError(`Max topics per student cannot exceed ${validTopics.length} topics.`);

    try {
      setSubmitting(true);

      await createPresentationCourse({
        courseId: form.courseId,
        teammates,
        submissionDeadline: form.submissionDeadline,
        presentationDate: form.presentationDate,
        topics: validTopics,
        maxStudentsPerTopic,
        maxTopicsPerStudent,
      });

      await loadCourses();
      setForm(EMPTY_FORM);
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete presentation group?",
      text: `"${course.courseName}" and all of its topic assignments will be removed.`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(course._id);
      await deletePresentationCourse(course._id);
      await loadCourses();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: err.message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setDeletingId(null);
    }
  };

  /* ───── Derived data ───── */

  const filteredCourses = courses.filter((course) =>
    course.courseName.toLowerCase().includes(search.toLowerCase()),
  );

  const sumStatus = (status) =>
    courses.reduce((sum, c) => sum + countByStatus(c, status), 0);

  const summary = [
    {
      label: "Total Courses",
      value: courses.length,
      icon: BookOpen,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Topics",
      value: courses.reduce((sum, c) => sum + c.topics.length, 0),
      icon: Presentation,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Topics Selected",
      value: sumStatus("selected"),
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Submitted",
      value: sumStatus("submitted"),
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  const previewGroups = Math.ceil(
    (availableCourses.find((course) => course._id === form.courseId)?.enrollmentCount || 0) /
      Math.max(1, Number(form.teammates) || 1),
  );

  /* ───── Render ───── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Presentations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create presentation groups, assign topics, and track student submissions.
          </p>
        </div>

        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Presentation Group
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.iconBg}`}>
                  <Icon size={21} className={stat.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Course list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Course Presentation Groups</h3>
            <p className="mt-1 text-sm text-slate-500">Select a course to manage topics, groups and submissions.</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading presentation groups...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="rounded-full bg-blue-50 p-4">
                <Presentation size={28} className="text-blue-600" />
              </div>
              <h4 className="mt-4 font-semibold text-slate-900">
                {search ? "No courses found" : "No presentation groups yet"}
              </h4>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search
                  ? "Try searching with a different course name."
                  : "Create a presentation group to start managing topics and submissions."}
              </p>
              {!search && (
                <button
                  onClick={openModal}
                  className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create your first group
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredCourses.map((course) => {
                const total = course.topics.length;
                const returnTo = dashboardPath === "/dashboard/admin"
                  ? "admin"
                  : dashboardPath === "/dashboard/faculty"
                    ? "faculty"
                    : null;
                const detailsHref = `/dashboard/cr/presentations/${encodeURIComponent(course._id)}${returnTo ? `?returnTo=${returnTo}` : ""}`;
                const locked = countByStatus(course, "locked");
                const studentCount = course.enrollmentCount ??
                  (course.courseId ? 0 : legacyPresentationStudents.length);
                const groupCount = Math.ceil(
                  studentCount / Math.max(1, Number(course.teammates) || 1),
                );

                return (
                  <div
                    key={course._id}
                    className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={detailsHref} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <BookOpen size={21} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate font-semibold text-slate-900 transition group-hover:text-blue-700">
                            {course.courseCode ? `${course.courseCode} · ${course.courseTitle || course.courseName}` : course.courseName}
                          </h4>
                          <p className="mt-1 text-xs text-slate-500">
                            {total} presentation topics
                            {locked > 0 && ` · ${locked} locked`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Up to {course.maxStudentsPerTopic || 1} {(course.maxStudentsPerTopic || 1) === 1 ? "student" : "students"} per topic · {course.maxTopicsPerStudent || 1} {(course.maxTopicsPerStudent || 1) === 1 ? "topic" : "topics"} per student
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() => handleDelete(course)}
                        disabled={deletingId === course._id}
                        title="Delete course"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === course._id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2">
                      {[
                        { label: "Available", value: countByStatus(course, "available"), cls: "bg-blue-50/70 text-blue-700" },
                        { label: "Full", value: countByStatus(course, "full"), cls: "bg-amber-50/70 text-amber-700" },
                        { label: "Submitted", value: countByStatus(course, "submitted"), cls: "bg-green-50/70 text-green-700" },
                        { label: "Locked", value: locked, cls: "bg-slate-100 text-slate-600" },
                      ].map((s) => (
                        <div key={s.label} className={`rounded-lg p-3 ${s.cls}`}>
                          <p className="text-[11px] font-medium">{s.label}</p>
                          <p className="mt-1 text-xl font-bold">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        Due {formatDay(course.submissionDeadline)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Presentation size={14} />
                        Present {formatDay(course.presentationDate)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users size={15} />
                        {course.teammates} per group · {groupCount} groups
                      </div>

                      <Link
                        href={detailsHref}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        View Details
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowModal(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-semibold text-slate-900">Create Presentation</h3>
                <p className="mt-1 text-sm text-slate-500">Add a course and its presentation topics.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="">Select an assigned course</option>
                  {availableCourses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode} · {course.title}
                    </option>
                  ))}
                </select>
                {availableCourses.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-700">No active assigned courses are available for presentations.</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Teammates per Group</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.teammates}
                  onChange={(e) => setForm({ ...form, teammates: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {availableCourses.find((course) => course._id === form.courseId)?.enrollmentCount || 0} enrolled students → {previewGroups} groups, each with one team leader.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Students per Topic</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxStudentsPerTopic}
                    onChange={(e) => setForm({ ...form, maxStudentsPerTopic: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">How many students can choose the same topic</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Topics per Student</label>
                  <input
                    type="number"
                    min="1"
                    max="1"
                    value={form.maxTopicsPerStudent}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">One topic per student in each presentation group</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Submission Deadline</label>
                  <input
                    type="date"
                    value={form.submissionDeadline}
                    min={today()}
                    onChange={(e) => setForm({ ...form, submissionDeadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Last date for submitting the presentation.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Presentation Date</label>
                  <input
                    type="date"
                    value={form.presentationDate}
                    min={form.submissionDeadline || today()}
                    onChange={(e) => setForm({ ...form, presentationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Scheduled date for the actual presentation.</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Presentation Topics</label>
                  <span className="text-xs text-slate-400">
                    {form.topics.length}/{MAX_TOPICS}
                  </span>
                </div>

                <div className="space-y-3">
                  {form.topics.map((topic, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={topic}
                        onChange={(e) => handleTopicChange(index, e.target.value)}
                        placeholder={`Topic ${index + 1}`}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      {form.topics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTopic(index)}
                          className="rounded-lg border border-slate-200 px-3 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={17} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addTopic}
                  disabled={form.topics.length >= MAX_TOPICS}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={16} />
                  Add another topic
                </button>
              </div>

              {error && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
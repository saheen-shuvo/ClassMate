/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Presentation,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck,
  Trash2,
  X,
  ArrowRight,
} from "lucide-react";

import {
  getPresentationCourses,
  createPresentationCourse,
  deletePresentationCourse,
} from "@/lib/presentationStorage";

export default function PresentationComponent() {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    courseName: "",
    teammates: "5",
    submissionDeadline: "",
    presentationDate: "",
    topics: [""],
  });
  const [error, setError] = useState("");

  const loadCourses = async () => {
    try {
      setLoading(true);

      const data = await getPresentationCourses();
      setCourses(data);
    } catch (error) {
      console.error("Failed to load presentations:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleTopicChange = (index, value) => {
    const updatedTopics = [...form.topics];
    updatedTopics[index] = value;

    setForm({ ...form, topics: updatedTopics });
  };

  const addTopic = () => {
    if (form.topics.length >= 10) return;

    setForm({
      ...form,
      topics: [...form.topics, ""],
    });
  };

  const removeTopic = (index) => {
    if (form.topics.length <= 1) return;

    setForm({
      ...form,
      topics: form.topics.filter((_, i) => i !== index),
    });
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError("");

    const validTopics = form.topics
      .map((topic) => topic.trim())
      .filter(Boolean);

    if (!form.courseName.trim()) {
      setError("Please enter a course name.");
      return;
    }

    if (!form.submissionDeadline) {
      setError("Please select a submission deadline.");
      return;
    }

    if (!form.presentationDate) {
      setError("Please select a presentation date.");
      return;
    }

    if (form.submissionDeadline > form.presentationDate) {
      setError("Submission deadline cannot be after presentation date.");
      return;
    }

    if (!validTopics.length) {
      setError("Please add at least one topic.");
      return;
    }

    if (
      new Set(validTopics.map((t) => t.toLowerCase())).size !==
      validTopics.length
    ) {
      setError("Duplicate topics are not allowed.");
      return;
    }

    try {
      setSubmitting(true);

      await createPresentationCourse({
        courseName: form.courseName.trim(),
        teammates: Number(form.teammates),
        submissionDeadline: form.submissionDeadline,
        presentationDate: form.presentationDate,
        topics: validTopics,
      });

      await loadCourses();

      setForm({
        courseName: "",
        teammates: "5",
        submissionDeadline: "",
        presentationDate: "",
        topics: [""],
      });

      setShowModal(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Delete the presentation group for ${course.courseName}?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(course._id);

      await deletePresentationCourse(course._id);

      await loadCourses();
    } catch (error) {
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };
  const filteredCourses = courses.filter((course) =>
    course.courseName.toLowerCase().includes(search.toLowerCase()),
  );

  const getStats = (course) => ({
    total: course.topics.length,
    available: course.topics.filter((t) => t.status === "available").length,
    selected: course.topics.filter((t) => t.status === "selected").length,
    submitted: course.topics.filter((t) => t.status === "submitted").length,
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Presentations
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage course presentation topics and track student submissions.
            </p>
          </div>

          <button
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Create Presentation Group
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
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
              value: courses.reduce(
                (sum, c) =>
                  sum + c.topics.filter((t) => t.status === "selected").length,
                0,
              ),
              icon: Clock,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-600",
            },
            {
              label: "Submitted",
              value: courses.reduce(
                (sum, c) =>
                  sum + c.topics.filter((t) => t.status === "submitted").length,
                0,
              ),
              icon: CheckCircle2,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>

                  <div className={`rounded-lg p-3 ${stat.iconBg}`}>
                    <Icon size={21} className={stat.iconColor} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Course List */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Course Presentation Groups
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a course to view its topics and submissions.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
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
                <p className="mt-3 text-sm text-slate-500">
                  Loading presentation groups...
                </p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-blue-50 p-4">
                  <Presentation size={28} className="text-blue-600" />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  {search ? "No courses found" : "No presentation groups yet"}
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {search
                    ? "Try searching with a different course name."
                    : "Create a presentation group to start managing topics and submissions."}
                </p>

                {!search && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create your first group
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {filteredCourses.map((course) => {
                  const stats = getStats(course);

                  return (
                    <div
                      key={course._id}
                      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/dashboard/cr/presentations/${encodeURIComponent(
                            course._id,
                          )}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <BookOpen size={21} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-900 transition group-hover:text-blue-700">
                              {course.courseName}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {stats.total} presentation topics
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

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-blue-50/70 p-3">
                          <p className="text-xs font-medium text-blue-700">
                            Available
                          </p>
                          <p className="mt-1 text-xl font-bold text-blue-700">
                            {stats.available}
                          </p>
                        </div>

                        <div className="rounded-lg bg-amber-50/70 p-3">
                          <p className="text-xs font-medium text-amber-700">
                            Selected
                          </p>
                          <p className="mt-1 text-xl font-bold text-amber-700">
                            {stats.selected}
                          </p>
                        </div>

                        <div className="rounded-lg bg-green-50/70 p-3">
                          <p className="text-xs font-medium text-green-700">
                            Submitted
                          </p>
                          <p className="mt-1 text-xl font-bold text-green-700">
                            {stats.submitted}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users size={15} />
                          {course.teammates} teammates
                        </div>

                        <Link
                          href={`/dashboard/cr/presentations/${encodeURIComponent(
                            course._id,
                          )}`}
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

        {/* Create Course Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Create Presentation
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a course and its presentation topics.
                  </p>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Course Name
                  </label>
                  <input
                    value={form.courseName}
                    onChange={(e) =>
                      setForm({ ...form, courseName: e.target.value })
                    }
                    placeholder="e.g. Machine Learning"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Number of Teammates
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.teammates}
                    onChange={(e) =>
                      setForm({ ...form, teammates: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Presentation Schedule */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Submission Deadline
                    </label>

                    <input
                      type="date"
                      value={form.submissionDeadline}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setForm({ ...form, submissionDeadline: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Last date for submitting the group presentation.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Presentation Date
                    </label>

                    <input
                      type="date"
                      value={form.presentationDate}
                      min={
                        form.submissionDeadline ||
                        new Date().toISOString().split("T")[0]
                      }
                      onChange={(e) =>
                        setForm({ ...form, presentationDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Scheduled date for the actual presentation.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Presentation Topics
                    </label>
                    <span className="text-xs text-slate-400">
                      {form.topics.length}/10
                    </span>
                  </div>

                  <div className="space-y-3">
                    {form.topics.map((topic, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          value={topic}
                          onChange={(e) =>
                            handleTopicChange(index, e.target.value)
                          }
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
                    disabled={form.topics.length >= 10}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={16} />
                    Add another topic
                  </button>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </p>
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
    </div>
  );
}

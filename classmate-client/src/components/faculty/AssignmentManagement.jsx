
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  ClipboardList,
  CalendarDays,
  Clock,
  Pencil,
  Trash2,
  X,
  Award,
  FileText,
} from "lucide-react";
import Swal from "sweetalert2";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const COURSES = [
  { value: "CSE 412", label: "CSE 412 - Machine Learning" },
  { value: "CSE 321", label: "CSE 321 - Operating Systems" },
  { value: "CSE 331", label: "CSE 331 - Database Systems" },
  { value: "CSE 421", label: "CSE 421 - Cloud Computing" },
];

const INITIAL_FORM = {
  title: "",
  description: "",
  instructions: "",
  course: "CSE 412",
  dueDate: "",
  totalMarks: "100",
};

function getDeadlineStatus(dueDate) {
  const deadline = new Date(dueDate);
  const now = new Date();

  if (Number.isNaN(deadline.getTime())) return "Unknown";
  return deadline < now ? "Overdue" : "Upcoming";
}

function formatDate(date) {
  if (!date) return "Not set";

  return new Date(date).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssignmentManagement({
  openCreateOnMount = false,
  onCreateModalHandled,
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(openCreateOnMount);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(INITIAL_FORM);
  const onCreateModalHandledRef = useRef(onCreateModalHandled);

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/assignments`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load assignments.");
      }

      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch assignments error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load assignments",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAssignments);
  }, [fetchAssignments]);

  // Automatically open Create Assignment modal from Quick Actions
  useEffect(() => {
    onCreateModalHandledRef.current = onCreateModalHandled;
  }, [onCreateModalHandled]);

  useEffect(() => {
    if (openCreateOnMount) onCreateModalHandledRef.current?.();
  }, [openCreateOnMount]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM });
    setModalOpen(true);
  };

  const openEditModal = (assignment) => {
    const dueDate = new Date(assignment.dueDate);
    const localDate = new Date(
      dueDate.getTime() - dueDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setEditingId(assignment._id);
    setForm({
      title: assignment.title || "",
      description: assignment.description || "",
      instructions: assignment.instructions || "",
      course: assignment.course || "CSE 412",
      dueDate: localDate,
      totalMarks: String(assignment.totalMarks ?? 100),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.dueDate ||
      !form.totalMarks
    ) {
      Swal.fire({
        icon: "warning",
        title: "Missing information",
        text: "Please complete all required fields.",
      });
      return;
    }

    const marks = Number(form.totalMarks);

    if (!Number.isFinite(marks) || marks <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid marks",
        text: "Total marks must be greater than zero.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `${API_URL}/api/assignments/${editingId}`
        : `${API_URL}/api/assignments`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          instructions: form.instructions.trim(),
          totalMarks: marks,
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save assignment.");
      }

      setModalOpen(false);
      setForm({ ...INITIAL_FORM });
      setEditingId(null);

      await fetchAssignments();

      Swal.fire({
        icon: "success",
        title: isEditing ? "Assignment updated" : "Assignment published",
        text: data.message,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Save assignment error:", error);

      Swal.fire({
        icon: "error",
        title: "Operation failed",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete assignment?",
      text: "This assignment will be permanently deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/assignments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete assignment.");
      }

      setAssignments((prev) => prev.filter((item) => item._id !== id));

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Assignment deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message,
      });
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const keyword = search.toLowerCase().trim();

    const matchesSearch =
      assignment.title?.toLowerCase().includes(keyword) ||
      assignment.description?.toLowerCase().includes(keyword) ||
      assignment.course?.toLowerCase().includes(keyword);

    const matchesCourse =
      courseFilter === "All" || assignment.course === courseFilter;

    const status = getDeadlineStatus(assignment.dueDate);
    const matchesStatus =
      statusFilter === "All" || status === statusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const upcomingCount = assignments.filter(
    (item) => getDeadlineStatus(item.dueDate) === "Upcoming"
  ).length;

  const overdueCount = assignments.filter(
    (item) => getDeadlineStatus(item.dueDate) === "Overdue"
  ).length;

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Assignment Management
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Create, publish, update and manage course assignments.
          </p>
          <p className="mt-2 text-xs font-semibold text-blue-600">
            {filteredAssignments.length} of {assignments.length} assignments
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchAssignments}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Assignment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Total Assignments
            </p>
            <ClipboardList className="text-blue-600" size={20} />
          </div>
          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {assignments.length}
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">Created assignments</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Upcoming Deadlines
            </p>
            <Clock className="text-amber-600" size={20} />
          </div>
          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {upcomingCount}
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">Not yet due</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Overdue Assignments
            </p>
            <CalendarDays className="text-rose-600" size={20} />
          </div>
          <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
            {overdueCount}
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">Deadline has passed</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by assignment title, description or course..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-blue-500"
            >
              <option value="All">All Courses</option>
              {COURSES.map((course) => (
                <option key={course.value} value={course.value}>
                  {course.value}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-blue-500"
            >
              <option value="All">All Deadlines</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {(search || courseFilter !== "All" || statusFilter !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setCourseFilter("All");
              setStatusFilter("All");
            }}
            className="mt-3 text-xs font-semibold text-rose-600"
          >
            Clear Filters ×
          </button>
        )}
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <RefreshCw size={24} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-3 text-xs text-slate-500">
            Loading assignments...
          </p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ClipboardList size={34} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">
            No Assignments Found
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Create a new assignment or change your search filters.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Create Your First Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredAssignments.map((assignment) => {
            const status = getDeadlineStatus(assignment.dueDate);

            return (
              <article
                key={assignment._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText size={21} />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                        {assignment.course}
                      </span>
                      <h3 className="mt-2 break-words text-sm font-bold text-slate-900">
                        {assignment.title}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      status === "Overdue"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-slate-500">
                  {assignment.description}
                </p>

                {assignment.instructions && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Instructions
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {assignment.instructions}
                    </p>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2">
                    <CalendarDays size={15} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400">Due Date</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">
                        {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Award size={15} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-400">Total Marks</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">
                        {assignment.totalMarks} marks
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400">
                    Published: {formatDate(assignment.createdAt)}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(assignment)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Edit assignment"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(assignment._id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setModalOpen(false);
            }
          }}
        >
          <div className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Assignment" : "Create New Assignment"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Provide the assignment details for your students.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Assignment Title *
                </label>
                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Machine Learning Assignment 01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Target Course *
                </label>
                <select
                  required
                  value={form.course}
                  onChange={(e) =>
                    setForm({ ...form, course: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-blue-500"
                >
                  {COURSES.map((course) => (
                    <option key={course.value} value={course.value}>
                      {course.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Description *
                </label>
                <textarea
                  required
                  maxLength={3000}
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe the assignment..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Instructions (Optional)
                </label>
                <textarea
                  maxLength={3000}
                  rows={3}
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  placeholder="Submission guidelines, formatting rules, etc."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Submission Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    value={form.totalMarks}
                    onChange={(e) =>
                      setForm({ ...form, totalMarks: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      {editingId ? "Save Changes" : "Publish Assignment"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

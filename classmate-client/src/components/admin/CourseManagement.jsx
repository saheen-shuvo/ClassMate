"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Users,
  UserPlus,
  Power,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import {
  createCourse,
  deleteCourse,
  enrollStudent,
  getCourseStudents,
  getCourses,
  removeCourseStudent,
  updateCourse,
} from "@/lib/courseStorage";

const EMPTY_FORM = {
  courseCode: "",
  title: "",
  description: "",
  department: "",
  semester: "",
  academicYear: "",
  facultyId: "",
  crId: "",
  status: "active",
};

export default function CourseManagement({ users = [] }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState("");
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [enrollingId, setEnrollingId] = useState("");
  const [removingId, setRemovingId] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCourses();
      if (!Array.isArray(data)) throw new Error("Unexpected courses response.");
      setCourses(data);
    } catch (requestError) {
      setError(requestError.message || "Failed to load courses.");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCourses);
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = !query || [
        course.courseCode,
        course.title,
        course.department,
        course.semester,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch &&
        (yearFilter === "all" || course.academicYear === yearFilter) &&
        (statusFilter === "all" || course.status === statusFilter);
    });
  }, [courses, search, yearFilter, statusFilter]);

  const years = useMemo(
    () => [...new Set(courses.map((course) => course.academicYear).filter(Boolean))].sort().reverse(),
    [courses],
  );
  const facultyUsers = users.filter((user) => user.role === "faculty" && user.active !== false);
  const crUsers = users.filter((user) => user.role === "cr" && user.active !== false);
  const inactiveFaculty = users.find((user) =>
    user.role === "faculty" && user.active === false && String(user._id) === String(selectedCourse?.facultyId),
  );
  const inactiveCr = users.find((user) =>
    user.role === "cr" && user.active === false && String(user._id) === String(selectedCourse?.crId),
  );
  const studentUsers = users.filter((user) => user.role === "student" && user.active !== false);
  const enrolledIds = new Set((selectedCourse?.studentIds || []).map(String));
  const availableStudents = studentUsers.filter((student) =>
    !enrolledIds.has(String(student._id)) &&
    `${student.name} ${student.email} ${student.studentId || ""}`.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const openCreate = () => {
    setModalError("");
    setForm(EMPTY_FORM);
    setSelectedCourse(null);
    setModal("form");
  };

  const openEdit = (course) => {
    setModalError("");
    setForm({
      courseCode: course.courseCode || "",
      title: course.title || "",
      description: course.description || "",
      department: course.department || "",
      semester: course.semester || "",
      academicYear: course.academicYear || "",
      facultyId: course.facultyId || "",
      crId: course.crId || "",
      status: course.status || "active",
    });
    setSelectedCourse(course);
    setModal("form");
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (selectedCourse) await updateCourse(selectedCourse._id, form);
      else {
        const { status, ...newCourse } = form;
        await createCourse(newCourse);
      }
      setModal("");
      await loadCourses();
      Swal.fire({
        icon: "success",
        title: selectedCourse ? "Course updated" : "Course created",
        confirmButtonColor: "#2563eb",
      });
    } catch (requestError) {
      setModalError(requestError.message || "Failed to save course.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (course) => {
    const nextStatus = course.status === "active" ? "inactive" : "active";
    try {
      await updateCourse(course._id, { status: nextStatus });
      await loadCourses();
    } catch (requestError) {
      setError(requestError.message || "Failed to change course status.");
    }
  };

  const openRoster = async (course) => {
    setSelectedCourse(course);
    setStudents([]);
    setStudentSearch("");
    setModalError("");
    setStudentsLoading(true);
    setModal("roster");
    try {
      const roster = await getCourseStudents(course._id);
      setStudents(Array.isArray(roster) ? roster : []);
      setSelectedCourse({
        ...course,
        studentIds: (Array.isArray(roster) ? roster : []).map((student) => student._id),
        enrollmentCount: Array.isArray(roster) ? roster.length : 0,
      });
    } catch (requestError) {
      setModalError(requestError.message || "Failed to load enrolled students.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const addStudent = async (student) => {
    try {
      setModalError("");
      setEnrollingId(student._id);
      await enrollStudent(selectedCourse._id, student._id);
      const roster = await getCourseStudents(selectedCourse._id);
      setStudents(roster);
      await loadCourses();
      setSelectedCourse((current) => ({
        ...current,
        studentIds: [...(current.studentIds || []), student._id],
        enrollmentCount: roster.length,
      }));
    } catch (requestError) {
      setModalError(requestError.message || "Failed to enroll student.");
    } finally {
      setEnrollingId("");
    }
  };

  const removeStudent = async (student) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Remove student?",
      text: `Remove ${student.name} from ${selectedCourse.courseCode}?`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;
    try {
      setModalError("");
      setRemovingId(student._id);
      await removeCourseStudent(selectedCourse._id, student._id);
      setStudents((current) => current.filter((entry) => entry._id !== student._id));
      setSelectedCourse((current) => ({
        ...current,
        studentIds: (current.studentIds || []).filter((id) => String(id) !== String(student._id)),
        enrollmentCount: Math.max(0, (current.enrollmentCount || 0) - 1),
      }));
      await loadCourses();
    } catch (requestError) {
      setModalError(requestError.message || "Failed to remove student.");
    } finally {
      setRemovingId("");
    }
  };

  const deleteSelectedCourse = async (course) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete course?",
      text: "Only inactive courses with no enrolled students or linked academic resources can be deleted.",
      showCancelButton: true,
      confirmButtonText: "Delete course",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;
    try {
      await deleteCourse(course._id);
      await loadCourses();
      Swal.fire({ icon: "success", title: "Course deleted", confirmButtonColor: "#2563eb" });
    } catch (requestError) {
      setError(requestError.message || "Course cannot be deleted.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Course Management</h2>
          <p className="mt-1 text-xs text-slate-500">Create courses, assign staff, and manage student enrollment.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
          <Plus size={15} /> Create course
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, title, department, semester..." className="w-full bg-transparent text-xs outline-none" />
        </label>
        <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
          <option value="all">All academic years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={loadCourses} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-2xl bg-slate-200" /><div className="h-48 animate-pulse rounded-2xl bg-slate-200" /></div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookOpen size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">{error ? "Courses unavailable" : "No courses found"}</p>
          <p className="mt-1 text-xs text-slate-500">{error || "Create a course or adjust the search filters."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <article key={course._id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-700">{course.courseCode}</p>
                  <h3 className="mt-1 break-words text-sm font-bold text-slate-900">{course.title}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${course.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{course.status}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">{course.department} · {course.semester} · {course.academicYear}</p>
              {course.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{course.description}</p>}
              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <p>Faculty: {course.faculty?.name || "Not assigned"}</p>
                <p>CR: {course.cr?.name || "Not assigned"}</p>
                <p>{course.enrollmentCount || 0} enrolled</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => openRoster(course)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100"><Users size={13} /> Enrollment</button>
                <button onClick={() => openEdit(course)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"><Pencil size={13} /> Edit</button>
                <button onClick={() => toggleStatus(course)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"><Power size={13} /> {course.status === "active" ? "Deactivate" : "Activate"}</button>
                {course.status === "inactive" && <button onClick={() => deleteSelectedCourse(course)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 px-2.5 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><Trash2 size={13} /> Delete safely</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {modal === "form" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form onSubmit={saveCourse} className="my-auto max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-bold text-slate-900">{selectedCourse ? "Edit course" : "Create course"}</h3><p className="mt-1 text-xs text-slate-500">Only existing active accounts can be assigned.</p></div>
              <button type="button" onClick={() => setModal("")} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {modalError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{modalError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["courseCode", "Course code"],
                ["title", "Course title"],
                ["department", "Department"],
                ["semester", "Semester"],
                ["academicYear", "Academic year"],
              ].map(([field, label]) => (
                <label key={field} className="text-xs font-semibold text-slate-600">{label}
                  <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required maxLength={field === "title" ? 160 : 120} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
                </label>
              ))}
              <label className="text-xs font-semibold text-slate-600">Faculty
                <select value={form.facultyId} onChange={(event) => setForm({ ...form, facultyId: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                  <option value="">Unassigned</option>{facultyUsers.map((account) => <option key={account._id} value={account._id}>{account.name} · {account.email}</option>)}
                  {inactiveFaculty && <option value={inactiveFaculty._id}>{inactiveFaculty.name} · inactive (existing assignment)</option>}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Class Representative
                <select value={form.crId} onChange={(event) => setForm({ ...form, crId: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                  <option value="">Unassigned</option>{crUsers.map((account) => <option key={account._id} value={account._id}>{account.name} · {account.email}</option>)}
                  {inactiveCr && <option value={inactiveCr._id}>{inactiveCr.name} · inactive (existing assignment)</option>}
                </select>
              </label>
              {selectedCourse && <label className="text-xs font-semibold text-slate-600">Status
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </label>}
            </div>
            <label className="block text-xs font-semibold text-slate-600">Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={2000} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal("")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save course"}</button>
            </div>
          </form>
        </div>
      )}

      {modal === "roster" && selectedCourse && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold text-blue-700">{selectedCourse.courseCode}</p><h3 className="mt-1 text-lg font-bold text-slate-900">Manage enrollment</h3><p className="mt-1 text-xs text-slate-500">{selectedCourse.title} · {students.length} enrolled</p></div>
              <button onClick={() => setModal("")} aria-label="Close enrollment" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {modalError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{modalError}</p>}
            <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Search size={15} className="text-slate-400" /><input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students to enroll..." className="w-full text-xs outline-none" /></label>
            {!studentsLoading && availableStudents.length > 0 && (
              <ul className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-slate-100">
                {availableStudents.slice(0, 8).map((student) => <li key={student._id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-3 py-2 last:border-0"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{student.name}</span><span className="block truncate text-[10px] text-slate-500">{student.studentId || student.email}</span></span><button onClick={() => addStudent(student)} disabled={enrollingId === student._id} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 disabled:opacity-50"><UserPlus size={12} /> Add</button></li>)}
              </ul>
            )}
            {studentsLoading ? <p className="py-8 text-center text-xs text-slate-500">Loading roster...</p> : students.length ? (
              <ul className="mt-5 divide-y divide-slate-100">
                {students.map((student) => <li key={student._id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{student.name}</span><span className="block truncate text-[10px] text-slate-500">{student.studentId || student.email}</span></span><button onClick={() => removeStudent(student)} disabled={removingId === student._id} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button></li>)}
              </ul>
            ) : !studentsLoading && <p className="py-8 text-center text-xs text-slate-500">No students are enrolled yet.</p>}
          </section>
        </div>
      )}
    </section>
  );
}

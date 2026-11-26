"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, RefreshCw, Users } from "lucide-react";
import { getCourses, getCourseStudents } from "@/lib/courseStorage";

export default function MyCourses({
  hidden = false,
  showStudents = false,
  onCoursesChange,
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rosterCourse, setRosterCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      const data = await getCourses();
      if (!Array.isArray(data)) throw new Error("Unexpected courses response.");
      setCourses(data);
      setError("");
      onCoursesChange?.(data);
    } catch (requestError) {
      console.error("Fetch courses error:", requestError);
      setError(requestError.message || "Failed to load courses.");
      setCourses([]);
      onCoursesChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [onCoursesChange]);

  useEffect(() => {
    void Promise.resolve().then(loadCourses);
  }, [loadCourses]);

  const openRoster = async (course) => {
    setRosterCourse(course);
    setRosterLoading(true);
    setRosterError("");
    try {
      const data = await getCourseStudents(course._id);
      setStudents(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setRosterError(requestError.message || "Failed to load the class roster.");
      setStudents([]);
    } finally {
      setRosterLoading(false);
    }
  };

  return (
    <section className="space-y-5" hidden={hidden}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Courses</h2>
          <p className="mt-1 text-xs text-slate-500">
            Courses assigned to you or enrolled by an administrator.
          </p>
        </div>
        <button
          onClick={loadCourses}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <p>{error}</p>
          <button onClick={loadCourses} className="mt-2 font-bold underline">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : courses.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookOpen size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No courses assigned yet</p>
          <p className="mt-1 text-xs text-slate-400">Courses will appear here when an administrator assigns or enrolls you.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <article key={course._id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BookOpen size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-700">{course.courseCode}</p>
                    <h3 className="mt-1 break-words text-sm font-bold text-slate-900">{course.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{course.department}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${course.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {course.status}
                </span>
              </div>
              <p className="mt-4 text-xs text-slate-500">{course.semester} · {course.academicYear}</p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>Faculty: {course.faculty?.name || "Not assigned"}</p>
                <p>CR: {course.cr?.name || "Not assigned"}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-500">{course.enrollmentCount} enrolled</span>
                {showStudents && (
                  <button
                    onClick={() => openRoster(course)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Users size={14} /> View students
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {rosterCourse && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <section className="my-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-700">{rosterCourse.courseCode}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Enrolled students</h3>
              </div>
              <button onClick={() => setRosterCourse(null)} aria-label="Close roster" className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            {rosterLoading ? (
              <p className="py-8 text-center text-xs text-slate-500">Loading roster...</p>
            ) : rosterError ? (
              <p role="alert" className="py-8 text-center text-xs text-rose-700">{rosterError}</p>
            ) : students.length ? (
              <ul className="mt-5 divide-y divide-slate-100">
                {students.map((student) => (
                  <li key={student._id} className="flex justify-between gap-3 py-3">
                    <span className="text-xs font-semibold text-slate-800">{student.name}</span>
                    <span className="text-xs text-slate-500">{student.studentId || student.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">No students are enrolled.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

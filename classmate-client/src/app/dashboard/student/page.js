/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Bell,
  Presentation,
  Brain,
  Menu,
  X,
  ChevronRight,
  LogOut,
  UserRound,
  CalendarDays,
  ArrowUpRight,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  GraduationCap,
  ClipboardList,
  Search,
  Sparkles,
  Megaphone,
} from "lucide-react";
import Swal from "sweetalert2";
import StudentPresentations from "@/components/studentDashboard/Presentations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// These are sample course and note records for the student dashboard UI.
// Replace them with your student/course and note APIs when those endpoints are ready.
const enrolledCourses = [
  {
    id: "CSE 412",
    code: "CSE 412",
    title: "Machine Learning",
    instructor: "Course Faculty",
    progress: 68,
    color: "blue",
  },
  {
    id: "CSE 321",
    code: "CSE 321",
    title: "Operating Systems",
    instructor: "Course Faculty",
    progress: 52,
    color: "violet",
  },
  {
    id: "CSE 331",
    code: "CSE 331",
    title: "Database Management Systems",
    instructor: "Course Faculty",
    progress: 81,
    color: "emerald",
  },
];

const courseNotes = [
  {
    id: 1,
    title: "Introduction to Machine Learning",
    course: "CSE 412",
    date: "Nov 05, 2026",
    type: "PDF",
  },
  {
    id: 2,
    title: "Operating System - Process Management",
    course: "CSE 321",
    date: "Nov 04, 2026",
    type: "PDF",
  },
  {
    id: 3,
    title: "Database Management Systems",
    course: "CSE 331",
    date: "Nov 02, 2026",
    type: "PDF",
  },
];

export default function StudentDashboardPage() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState("");
  const [toast, setToast] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    // Read only the existing login email. No new authentication format is assumed.
    const savedEmail = localStorage.getItem("userEmail") || "";
    setStudentEmail(savedEmail);

    if (savedEmail) {
      const emailName = savedEmail.split("@")[0].replace(/[._-]/g, " ");
      setStudentName(
        emailName.replace(/\b\w/g, (character) => character.toUpperCase()) || "Student"
      );
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementLoading(true);
      setAnnouncementError("");

      const response = await fetch(`${API_URL}/api/announcements`);
      if (!response.ok) {
        throw new Error("Could not load announcements.");
      }

      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch announcements error:", error);
      setAnnouncementError(error.message || "Failed to load announcements.");
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const navigate = (page) => {
    setActivePage(page);
    setMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Log out?",
      text: "Are you sure you want to log out of ClassMate?",
      showCancelButton: true,
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isLoggedIn");
    window.dispatchEvent(new Event("auth-change"));
    window.location.href = "/login";
  };

  const navigation = [
    {
      title: "MY LEARNING",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "courses", label: "My Courses", icon: BookOpen },
        { id: "notes", label: "Course Notes", icon: FileText },
      ],
    },
    {
      title: "ACADEMIC ACTIVITIES",
      items: [
        { id: "announcements", label: "Announcements", icon: Bell },
        { id: "presentations", label: "Presentations", icon: Presentation },
        { id: "quizzes", label: "Quiz Bank", icon: Brain },
      ],
    },
    {
      title: "ACCOUNT",
      items: [{ id: "profile", label: "My Profile", icon: UserRound }],
    },
  ];

  const pageTitles = {
    overview: "Student Overview",
    courses: "My Courses",
    notes: "Course Notes",
    announcements: "Announcements",
    presentations: "Presentations",
    quizzes: "Quiz Bank",
    profile: "My Profile",
  };

  const stats = [
    {
      title: "Enrolled Courses",
      value: enrolledCourses.length.toString().padStart(2, "0"),
      subtitle: "Your active courses",
      icon: BookOpen,
      color: "blue",
      footer: "Current semester",
    },
    {
      title: "Available Notes",
      value: courseNotes.length.toString().padStart(2, "0"),
      subtitle: "Learning materials",
      icon: FileText,
      color: "indigo",
      footer: "Course resources",
    },
    {
      title: "Announcements",
      value: announcements.length.toString().padStart(2, "0"),
      subtitle: "Faculty updates",
      icon: Bell,
      color: "amber",
      footer: "Latest notices",
    },
    {
      title: "Presentations",
      value: "—",
      subtitle: "Your presentation work",
      icon: Presentation,
      color: "purple",
      footer: "View presentation section",
    },
  ];

  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  const filteredNotes = courseNotes.filter((note) => {
    const search = searchTerm.toLowerCase();
    return (
      note.title.toLowerCase().includes(search) ||
      note.course.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Student sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[76px]" : "w-[260px]"
        } ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                Class<span className="text-blue-600">Mate</span>
              </h2>
              <p className="text-[10px] font-medium text-slate-400">
                Student Learning Portal
              </p>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:block"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div
          className={`mx-3 mt-5 rounded-xl bg-slate-50 p-3 ${
            sidebarCollapsed ? "flex justify-center" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {studentName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">{studentName}</p>
                <p className="text-[10px] text-slate-500">Student</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-7 overflow-y-auto px-3">
          {navigation.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      title={sidebarCollapsed ? item.label : ""}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      } ${sidebarCollapsed ? "justify-center" : ""}`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 ${
                          isActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.id === "announcements" && announcements.length > 0 && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              {announcements.length}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Home size={18} />
            {!sidebarCollapsed && "Home"}
          </Link>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && "Logout"}
          </button>
          {!sidebarCollapsed && (
            <p className="mt-4 text-center text-[10px] text-slate-400">
              ClassMate © 2026
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {pageTitles[activePage]}
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Keep track of your courses, resources, and academic updates.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <CalendarDays size={15} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Fall Semester 2026</span>
            </div>
            <button
              onClick={() => navigate("announcements")}
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              aria-label="View announcements"
            >
              <Bell size={19} />
              {announcements.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-blue-600" />
              )}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
          {toast && (
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
              <span>{toast}</span>
              <button onClick={() => setToast("")} aria-label="Dismiss message">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Overview */}
          {activePage === "overview" && (
            <>
              <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 sm:p-8">
                <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-blue-50 blur-3xl" />
                <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
                      <GraduationCap size={14} /> STUDENT WORKSPACE
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                      Welcome back, {studentName}!
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                      Continue learning, access your course materials, stay updated
                      with faculty announcements, and keep track of your academic work.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <UserRound size={14} className="text-blue-600" /> Student Account
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-blue-600" /> Fall Semester 2026
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => navigate("courses")}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <BookOpen size={16} /> My Courses
                    </button>
                    <button
                      onClick={() => navigate("notes")}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <FileText size={16} className="text-blue-600" /> Course Notes
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">My Academic Overview</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    A quick summary of your learning workspace.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[stat.color]}`}>
                            <Icon size={20} />
                          </div>
                          <ArrowUpRight size={17} className="text-slate-300" />
                        </div>
                        <div className="mt-5">
                          <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                          <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                            {stat.value}
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-400">{stat.subtitle}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
                          <Sparkles size={13} className="text-blue-500" /> {stat.footer}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-slate-900">Quick Access</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Open the tools and resources you use most.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          title: "My Courses",
                          description: "See the courses you are taking.",
                          icon: BookOpen,
                          action: () => navigate("courses"),
                        },
                        {
                          title: "Course Notes",
                          description: "Find lecture notes and materials.",
                          icon: FileText,
                          action: () => navigate("notes"),
                        },
                        {
                          title: "Announcements",
                          description: "Read important faculty updates.",
                          icon: Megaphone,
                          action: () => navigate("announcements"),
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            onClick={item.action}
                            className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30"
                          >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Icon size={20} />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                              {item.description}
                            </p>
                            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                              Open <ChevronRight size={13} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">My Courses</h3>
                        <p className="mt-1 text-xs text-slate-500">Your current semester courses.</p>
                      </div>
                      <button onClick={() => navigate("courses")} className="text-xs font-bold text-blue-600">
                        View all
                      </button>
                    </div>
                    <div className="space-y-4">
                      {enrolledCourses.slice(0, 3).map((course) => (
                        <div key={course.id} className="rounded-xl border border-slate-100 p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-blue-600">{course.code}</p>
                              <h4 className="mt-1 text-xs font-bold text-slate-800">{course.title}</h4>
                              <p className="mt-1 text-[10px] text-slate-400">{course.instructor}</p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-slate-600">{course.progress}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${course.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 xl:col-span-4">
                  <div className="rounded-2xl bg-slate-900 p-6 text-white">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                      <ClipboardList size={22} />
                    </div>
                    <h3 className="mt-4 text-base font-bold">Presentation Workspace</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Check your presentation topics and follow the instructions shared by your faculty.
                    </p>
                    <button
                      onClick={() => navigate("presentations")}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold transition hover:bg-blue-700"
                    >
                      View Presentations <ArrowUpRight size={15} />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Recent Announcements</h3>
                        <p className="mt-1 text-[11px] text-slate-400">Latest faculty updates.</p>
                      </div>
                      <button onClick={() => navigate("announcements")} className="text-xs font-bold text-blue-600">
                        View all
                      </button>
                    </div>
                    <AnnouncementPreview
                      announcements={announcements}
                      loading={announcementLoading}
                      error={announcementError}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Courses */}
          {activePage === "courses" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">My Enrolled Courses</h2>
                <p className="mt-1 text-xs text-slate-500">Review your current semester courses and progress.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles[course.color]}`}>
                        <BookOpen size={21} />
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {course.code}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-900">{course.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{course.instructor}</p>
                    <div className="mt-5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Course progress</span>
                      <span className="font-bold text-slate-700">{course.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Note: Course information is currently sample data. Connect your enrollment API to show each student's actual courses.
              </p>
            </section>
          )}

          {/* Course notes */}
          {activePage === "notes" && (
            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course Notes & Materials</h2>
                  <p className="mt-1 text-xs text-slate-500">Access learning resources shared by your faculty.</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search notes or course..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              {filteredNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <FileText size={28} className="mx-auto text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-700">No Notes Found</h3>
                  <p className="mt-1 text-xs text-slate-400">Try another search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText size={21} />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-slate-900">{note.title}</h3>
                      <p className="mt-2 text-xs text-slate-500">{note.course} · {note.date}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">{note.type}</span>
                        <span className="text-[10px] text-slate-400">Sample resource</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                Note: These are sample note records. A student notes API and file download links are not present in the supplied code.
              </p>
            </section>
          )}

          {/* Announcements */}
          {activePage === "announcements" && (
            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Course Announcements</h2>
                <p className="mt-1 text-xs text-slate-500">Read important updates and notices from your faculty.</p>
              </div>
              {announcementLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Loading announcements...
                </div>
              ) : announcementError ? (
                <div className="rounded-2xl border border-rose-100 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-rose-600">{announcementError}</p>
                  <button onClick={fetchAnnouncements} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                    Try again
                  </button>
                </div>
              ) : announcements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <Bell size={28} className="mx-auto text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-700">No Announcements Yet</h3>
                  <p className="mt-1 text-xs text-slate-400">There are no announcements to show right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((item) => (
                    <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {item.course && (
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{item.course}</span>
                        )}
                        {item.priority && (
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            item.priority === "High" ? "bg-rose-50 text-rose-600" :
                            item.priority === "Medium" ? "bg-amber-50 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>{item.priority} Priority</span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{item.description}</p>
                      <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={12} />
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Presentations */}
          {activePage === "presentations" && (
            <StudentPresentations studentEmail={studentEmail} />
          )}

          {/* Quiz bank */}
          {activePage === "quizzes" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Brain size={28} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">Quiz Bank</h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                Practice questions and learning activities will be available here when the Quiz Bank is connected.
              </p>
              <button
                onClick={() => showToast("Quiz Bank integration is coming soon.")}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Explore Quiz Bank
              </button>
            </section>
          )}

          {/* Profile */}
          {activePage === "profile" && (
            <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{studentName}</h2>
                  <p className="mt-1 text-xs text-slate-500">Student Account</p>
                </div>
              </div>
              <div className="space-y-4 pt-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Name</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{studentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-800">{studentEmail || "No email found in the current login session"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Account Type</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">Student</p>
                </div>
              </div>
              <p className="mt-6 text-[11px] text-slate-400">
                This page uses the email stored by the existing login flow. Connect a profile API to display full student information.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function AnnouncementPreview({ announcements, loading, error }) {
  if (loading) {
    return <p className="text-xs text-slate-400">Loading announcements...</p>;
  }

  if (error) {
    return <p className="text-xs text-rose-500">{error}</p>;
  }

  if (announcements.length === 0) {
    return <p className="text-xs text-slate-400">No announcements available.</p>;
  }

  return (
    <div className="space-y-4">
      {announcements.slice(0, 3).map((item) => (
        <div key={item._id} className="border-l-2 border-blue-500 pl-3">
          <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
            {item.description}
          </p>
          <span className="mt-1 block text-[10px] text-slate-400">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recently"}
          </span>
        </div>
      ))}
    </div>
  );
}
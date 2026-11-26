/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Bell,
  Presentation,
  ClipboardList,
  Brain,
  Menu,
  X,
  Plus,
  ChevronRight,
  LogOut,
  UserRound,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Trash2,
  Sparkles,
  Pencil,
  Download,
  ExternalLink,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  HomeIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import AcademicCalendar from "@/components/shared/AcademicCalendar";
import PresentationComponent from "@/components/crDashboard/Presentation";
import { getPresentationCourses } from "@/lib/presentationStorage";
import { getCurrentUser, logoutUser, dashboardForRole } from "@/lib/auth";
import CourseNotesLibrary from "@/components/shared/CourseNotesLibrary";
import MyCourses from "@/components/shared/MyCourses";
import AssignmentManagement from "@/components/faculty/AssignmentManagement";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "@/lib/announcementStorage";

const PAGE_TITLES = {
  overview: "Dashboard Overview",
  calendar: "Academic Calendar",
  courses: "My Courses",
  assignments: "Assignments",
  notes: "Course Notes",
  announcements: "Announcements",
  presentations: "Presentations",
  quizzes: "Quiz Bank",
};

const NAVIGATION = [
  {
    title: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "calendar", label: "Academic Calendar", icon: CalendarDays },
      { id: "courses", label: "My Courses", icon: BookOpen },
    ],
  },
  {
    title: "ACADEMIC MANAGEMENT",
    items: [
      { id: "notes", label: "Course Notes", icon: FileText },
      { id: "announcements", label: "Announcements", icon: Bell },
      { id: "presentations", label: "Presentations", icon: Presentation },
      { id: "assignments", label: "Assignments", icon: ClipboardList },
      { id: "quizzes", label: "Quiz Bank", icon: Brain },
    ],
  },
];

const COURSES = [
  { value: "CSE 412", label: "CSE 412 - Machine Learning" },
  { value: "CSE 321", label: "CSE 321 - Operating Systems" },
  { value: "CSE 331", label: "CSE 331 - Database Systems" },
  { value: "CSE 421", label: "CSE 421 - Cloud Computing" },
];

const COLOR_STYLES = {
  blue: "bg-blue-50 text-blue-600",
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

const PRIORITY_STYLES = {
  High: "bg-rose-50 text-rose-600",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-500",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  course: "CSE 412",
  priority: "Medium",
};

const formatAnnouncement = (announcement) => {
  const createdAt = announcement.createdAt ? new Date(announcement.createdAt) : null;
  const date =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : "Date unavailable";

  return {
    ...announcement,
    id: String(announcement._id),
    date,
  };
};

export default function CRDashboardPage() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState(null);
  const [crId, setCrId] = useState("");
  const announcementRequestRef = useRef(false);
  const [presentationCount, setPresentationCount] = useState(0);
  const [crName, setCrName] = useState("CR");
  const [myCourses, setMyCourses] = useState([]);

  const [notes, setNotes] = useState([]);

  const [announcements, setAnnouncements] = useState([]);

  // Restore the active tab from the URL hash (so "Back" from the details page lands on Presentations)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (PAGE_TITLES[hash]) setActivePage(hash);
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.role !== "cr") {
          window.location.href = dashboardForRole(data.user.role);
          return;
        }
        setCrName(data.user.name || "CR");
        setCrId(data.user._id);
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAnnouncements()
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data)) throw new Error("Unexpected announcements response.");
        setAnnouncements(data.map(formatAnnouncement));
        setAnnouncementError("");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Fetch announcements error:", error);
        setAnnouncementError(error.message || "Failed to load announcements.");
      })
      .finally(() => {
        if (!cancelled) setAnnouncementLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Presentation count for the overview card
  useEffect(() => {
    let cancelled = false;
    getPresentationCourses()
      .then((data) => {
        if (!cancelled) setPresentationCount(data?.length || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activePage]);

  const navigate = (page) => {
    setActivePage(page);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", `#${page}`);
  };

  const showToast = (message, type = "success") => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  };

  const openModal = (type) => {
    setForm(EMPTY_FORM);
    setEditingAnnouncement(null);
    setModal(type);
  };

  const closeModal = () => {
    if (announcementSubmitting) return;
    setModal(null);
    setEditingAnnouncement(null);
  };

  const openAnnouncementForEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      description: announcement.description,
      course: announcement.course,
      priority: announcement.priority,
    });
    setModal("announcements");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modal === "announcements") {
      const announcementDetails = {
        title: form.title.trim(),
        description: form.description.trim(),
        course: form.course,
        priority: form.priority,
      };

      if (!announcementDetails.title || !announcementDetails.description || !announcementDetails.course) {
        showToast("Please complete all announcement fields.", "error");
        return;
      }

      if (announcementRequestRef.current) return;
      announcementRequestRef.current = true;
      setAnnouncementSubmitting(true);
      try {
        const response = editingAnnouncement
          ? await updateAnnouncement(editingAnnouncement.id, announcementDetails)
          : await createAnnouncement(announcementDetails);
        const savedAnnouncement = formatAnnouncement(response.announcement);

        if (editingAnnouncement) {
          setAnnouncements((previous) =>
            previous.map((item) => (item.id === savedAnnouncement.id ? savedAnnouncement : item)),
          );
          showToast("Announcement updated successfully!");
        } else {
          setAnnouncements((previous) => [savedAnnouncement, ...previous]);
          showToast("Announcement published successfully!");
        }
        setAnnouncementError("");
        setModal(null);
        setEditingAnnouncement(null);
      } catch (error) {
        console.error("Save announcement error:", error);
        showToast(error.message || "Failed to save announcement.", "error");
      } finally {
        announcementRequestRef.current = false;
        setAnnouncementSubmitting(false);
      }
      return;
    }

    setModal(null);
  };

  const handleDeleteAnnouncement = async (announcement) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete announcement?",
      text: "This announcement will be permanently deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });

    if (!result.isConfirmed || deletingAnnouncementId) return;

    setDeletingAnnouncementId(announcement.id);
    try {
      await deleteAnnouncement(announcement.id);
      setAnnouncements((previous) => previous.filter((item) => item.id !== announcement.id));
      showToast("Announcement deleted successfully!");
    } catch (error) {
      console.error("Delete announcement error:", error);
      showToast(error.message || "Failed to delete announcement.", "error");
    } finally {
      setDeletingAnnouncementId(null);
    }
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
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await logoutUser();
      window.dispatchEvent(new Event("auth-change"));

      await Swal.fire({
        icon: "success",
        title: "Logged out!",
        text: "You have successfully logged out.",
        confirmButtonColor: "#2563eb",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      Swal.fire({
        icon: "error",
        title: "Logout failed",
        text: "Please try again.",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const stats = [
    { title: "Assigned Courses", value: String(myCourses.length).padStart(2, "0"), subtitle: "Courses assigned to you", icon: BookOpen, color: "blue", growth: "Current assignments" },
    { title: "Uploaded Notes", value: String(notes.length).padStart(2, "0"), subtitle: "Lecture materials", icon: FileText, color: "indigo", growth: "+5 this week" },
    { title: "Announcements", value: String(announcements.length).padStart(2, "0"), subtitle: "Published broadcasts", icon: Bell, color: "amber", growth: "+3 this week" },
    { title: "Presentations", value: String(presentationCount).padStart(2, "0"), subtitle: "Presentation groups", icon: Presentation, color: "purple", growth: "Manage topics & spins" },
    { title: "Quiz Questions", value: "36", subtitle: "Community question bank", icon: Brain, color: "emerald", growth: "+8 this week" },
  ];

  const quickActions = [
    {
      title: "Browse Course Notes",
      description: "Share PDFs and lecture materials.",
      icon: FileText,
      action: () => navigate("notes"),
    },
    {
      title: "Post Announcement",
      description: "Notify students about important updates.",
      icon: Megaphone,
      action: () => {
        navigate("announcements");
        openModal("announcements");
      },
    },
    {
      title: "Manage Presentations",
      description: "Create groups, lock topics, run Lucky Spin.",
      icon: Presentation,
      action: () => navigate("presentations"),
    },
  ];

  const navCounts = {
    notes: notes.length,
    announcements: announcements.length,
    presentations: presentationCount,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-19" : "w-65"
        } ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                Class<span className="text-blue-600">Mate</span>
              </h2>
              <p className="text-[10px] font-medium text-slate-400">Academic Management</p>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:block"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        {/* Profile */}
        <div className={`mx-3 mt-5 rounded-xl bg-slate-50 p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {crName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">{crName}</p>
                <p className="text-[10px] text-slate-500">Course Representative</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 space-y-7 overflow-y-auto px-3">
          {NAVIGATION.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400">{group.title}</p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  const count = navCounts[item.id];

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
                        className={`shrink-0 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"}`}
                      />

                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {count > 0 && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] ${
                                isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {count}
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

        {/* Footer */}
        <div className="border-t border-slate-100 p-3">
          <Link
            href="/"
            title={sidebarCollapsed ? "Home" : ""}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <HomeIcon size={18} />
            {!sidebarCollapsed && "Home"}
          </Link>

          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : ""}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && "Logout"}
          </button>

          {!sidebarCollapsed && (
            <p className="mt-4 text-center text-[10px] text-slate-400">UniConnect © 2026</p>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:ml-19" : "lg:ml-65"}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{PAGE_TITLES[activePage]}</h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Manage your academic activities and course resources.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <CalendarDays size={15} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Fall Semester 2026</span>
            </div>

            <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-blue-600" />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
              S
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
          <CourseNotesLibrary
            canManage
            managerUserId={crId || null}
            hidden={activePage !== "notes"}
            onNotesChange={setNotes}
          />
          <MyCourses
            hidden={activePage !== "courses"}
            showStudents
            onCoursesChange={setMyCourses}
          />
          {/* Toast */}
          {toast && (
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${toastType === "error" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-blue-100 bg-blue-50 text-blue-700"}`}>
              <span>{toast}</span>
              <button onClick={() => setToast("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {/* ───────── Overview ───────── */}
          {activePage === "overview" && (
            <>
              <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 sm:p-8">
                <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-blue-50 blur-3xl" />

                <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
                      <Sparkles size={13} />
                      COURSE REPRESENTATIVE WORKSPACE
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                      Welcome back, {crName}!
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                      Manage your assigned courses, share learning materials, communicate with students, and organize
                      class presentations from one place.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <UserRound size={14} className="text-blue-600" />
                        Course Representative
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-blue-600" />
                        Fall Semester 2026
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => navigate("notes")}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <FileText size={16} />
                      Course Notes
                    </button>

                    <button
                      onClick={() => navigate("presentations")}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Presentation size={16} className="text-blue-600" />
                      Presentations
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">Workspace Overview</h3>
                  <p className="mt-1 text-xs text-slate-500">Your course management activity at a glance.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${COLOR_STYLES[stat.color]}`}>
                            <Icon size={20} />
                          </div>
                          <ArrowUpRight size={17} className="text-slate-300" />
                        </div>

                        <div className="mt-5">
                          <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                          <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{stat.value}</h3>
                          <p className="mt-1 text-[11px] text-slate-400">{stat.subtitle}</p>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold text-emerald-600">
                          <TrendingUp size={13} />
                          {stat.growth}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  {/* Quick actions */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
                      <p className="mt-1 text-xs text-slate-500">Frequently used course management tools.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.title}
                            onClick={action.action}
                            className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30"
                          >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Icon size={20} />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800">{action.title}</h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{action.description}</p>
                            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                              Get started <ChevronRight size={13} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent notes */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Recently Uploaded Notes</h3>
                        <p className="mt-1 text-xs text-slate-500">Latest learning resources.</p>
                      </div>
                      <button onClick={() => navigate("notes")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                        View all
                      </button>
                    </div>

                    <div className="space-y-3">
                      {notes.slice(0, 3).map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 sm:p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <FileText size={19} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="truncate text-xs font-bold text-slate-800">{note.title}</h4>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {note.course} · {note.date}
                              </p>
                            </div>
                          </div>
                          <span className="hidden shrink-0 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 sm:block">
                            PDF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 xl:col-span-4">
                  {/* Presentation card */}
                  <div className="rounded-2xl bg-slate-900 p-6 text-white">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                      <Presentation size={22} />
                    </div>
                    <h3 className="mt-4 text-base font-bold">Presentation Management</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Create presentation groups, assign topics manually or with Lucky Spin, lock topics, and see every
                      team leader and group.
                    </p>
                    <button
                      onClick={() => navigate("presentations")}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold transition hover:bg-blue-700"
                    >
                      Open Presentations
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                  {/* Recent announcements */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Recent Announcements</h3>
                        <p className="mt-1 text-[11px] text-slate-400">Latest course broadcasts.</p>
                      </div>
                      <button onClick={() => navigate("announcements")} className="text-xs font-bold text-blue-600">
                        View all
                      </button>
                    </div>

                    <div className="space-y-4">
                      {announcements.slice(0, 3).map((item) => (
                        <div key={item.id} className="border-l-2 border-blue-500 pl-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_STYLES[item.priority]}`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.description}</p>
                          <span className="mt-1 block text-[10px] text-slate-400">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ───────── Announcements ───────── */}
          {activePage === "announcements" && (
            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course Announcements</h2>
                  <p className="mt-1 text-xs text-slate-500">Communicate important academic updates with students.</p>
                </div>
                <button
                  onClick={() => openModal("announcements")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={16} /> New Announcement
                </button>
              </div>

              <div className="space-y-3">
                {announcementLoading && (
                  <p className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
                    Loading announcements...
                  </p>
                )}
                {!announcementLoading && announcementError && (
                  <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-700">
                    {announcementError}
                  </p>
                )}
                {!announcementLoading && !announcementError && announcements.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
                    No announcements yet.
                  </p>
                )}
                {announcements.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                            {item.course}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${PRIORITY_STYLES[item.priority]}`}>
                            {item.priority} Priority
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                        <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={12} /> {item.date}
                        </p>
                      </div>

                      {item.createdBy?._id === crId && item.createdBy?.role === "cr" && (
                        <div className="flex self-end gap-1 sm:self-start">
                          <button
                            type="button"
                            onClick={() => openAnnouncementForEdit(item)}
                            aria-label={`Edit ${item.title}`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(item)}
                            disabled={deletingAnnouncementId === item.id}
                            aria-label={`Delete ${item.title}`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePage === "calendar" && <AcademicCalendar role="cr" />}
          {activePage === "assignments" && <AssignmentManagement />}

          {/* ───────── Presentations ───────── */}
          {activePage === "presentations" && <PresentationComponent />}

          {/* ───────── Quiz bank ───────── */}
          {activePage === "quizzes" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Brain size={28} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">Community Quiz Bank</h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                Access and manage quiz questions contributed by your academic community.
              </p>
              <button
                onClick={() => showToast("Quiz Bank integration is coming soon.")}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Explore Quiz Bank
              </button>
            </section>
          )}
        </main>
      </div>

      {/* Announcement modal */}
      {modal && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">Fill in the information below.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={announcementSubmitting}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Course</label>
                <select
                  required
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {COURSES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter a title..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={4}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Write a short description..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={announcementSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={announcementSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {announcementSubmitting
                    ? "Saving..."
                    : editingAnnouncement
                      ? "Save Changes"
                      : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
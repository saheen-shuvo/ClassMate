/* eslint-disable react-hooks/set-state-in-effect */
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
  Upload,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
} from "lucide-react";
import PresentationComponent from "@/components/crDashboard/Presentation";
import AcademicCalendar from "@/components/shared/AcademicCalendar";
import Swal from "sweetalert2";
import { getCurrentUser, logoutUser, dashboardForRole } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function FacultyDashboardPage() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [facultyName, setFacultyName] = useState("Faculty");

  const [notes, setNotes] = useState([
    {
      id: 1,
      title: "Introduction to Machine Learning",
      course: "CSE 412",
      date: "Nov 05, 2026",
      size: "2.4 MB",
    },
    {
      id: 2,
      title: "Operating System - Process Management",
      course: "CSE 321",
      date: "Nov 04, 2026",
      size: "1.8 MB",
    },
    {
      id: 3,
      title: "Database Management Systems",
      course: "CSE 331",
      date: "Nov 02, 2026",
      size: "3.1 MB",
    },
  ]);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course: "CSE 412",
    priority: "Medium",
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementLoading(true);

      const response = await fetch(`${API_URL}/api/announcements`, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to fetch announcements.");
      }

      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch announcements error:", error);
      showToast("Failed to load announcements.");
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.role !== "faculty") {
          window.location.href = dashboardForRole(data.user.role);
          return;
        }
        setFacultyName(data.user.name || "Faculty");
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  const openModal = (type) => {
    setFormData({
      title: "",
      description: "",
      course: "CSE 412",
      priority: "Medium",
    });

    setModal(type);
  };

  const navigate = (page) => {
    setActivePage(page);
    setMobileSidebarOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modal === "notes") {
      setNotes((prev) => [
        {
          id: Date.now(),
          title: formData.title,
          course: formData.course,
          date: new Date().toLocaleDateString(),
          size: "Pending upload",
        },
        ...prev,
      ]);

      showToast("Note added successfully!");
      setModal(null);
      return;
    }

    if (modal === "announcements") {
      try {
        setAnnouncementSubmitting(true);

        const response = await fetch(`${API_URL}/api/announcements`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            course: formData.course,
            priority: formData.priority,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to publish announcement.",
          );
        }

        await fetchAnnouncements();

        showToast("Announcement published successfully!");
        setModal(null);
      } catch (error) {
        console.error("Publish announcement error:", error);
        showToast(error.message || "Failed to publish announcement.");
      } finally {
        setAnnouncementSubmitting(false);
      }
    }
  };

  const handleDeleteAnnouncement = async (id) => {
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

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete announcement.");
      }

      setAnnouncements((prev) => prev.filter((item) => item._id !== id));
      showToast("Announcement deleted successfully!");
    } catch (error) {
      console.error("Delete announcement error:", error);
      showToast(error.message || "Failed to delete announcement.");
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
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    await logoutUser();
    window.location.href = "/login";
  };

  const navigation = [
    {
      title: "WORKSPACE",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "calendar", label: "Academic Calendar", icon: CalendarDays },
      ],
    },
    {
      title: "ACADEMIC MANAGEMENT",
      items: [
        { id: "notes", label: "Course Notes", icon: FileText },
        { id: "announcements", label: "Announcements", icon: Bell },
        { id: "presentations", label: "Presentations", icon: Presentation },
        { id: "quizzes", label: "Quiz Bank", icon: Brain },
      ],
    },
  ];

  const pageTitles = {
    overview: "Dashboard Overview",
    calendar: "Mini Academic Calendar",
    notes: "Course Notes",
    announcements: "Announcements",
    presentations: "Presentation Topics",
    quizzes: "Quiz Bank",
  };

  const stats = [
    {
      title: "Assigned Courses",
      value: "05",
      subtitle: "Active course modules",
      icon: BookOpen,
      color: "blue",
      growth: "Current semester",
    },
    {
      title: "Uploaded Notes",
      value: notes.length.toString().padStart(2, "0"),
      subtitle: "Lecture materials",
      icon: FileText,
      color: "indigo",
      growth: "Available resources",
    },
    {
      title: "Announcements",
      value: announcements.length.toString().padStart(2, "0"),
      subtitle: "Published broadcasts",
      icon: Bell,
      color: "amber",
      growth: "Published updates",
    },
    {
      title: "Presentations",
      value: "08",
      subtitle: "Seminar topics",
      icon: Presentation,
      color: "purple",
      growth: "Presentation workspace",
    },
    {
      title: "Quiz Questions",
      value: "36",
      subtitle: "Community question bank",
      icon: Brain,
      color: "emerald",
      growth: "Quiz resources",
    },
  ];

  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  const getPriorityStyle = (priority) => {
    if (priority === "High") return "bg-rose-50 text-rose-600";
    if (priority === "Medium") return "bg-amber-50 text-amber-700";
    return "bg-slate-100 text-slate-500";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-slate-200 bg-white
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "w-[76px]" : "w-[260px]"}
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                Class<span className="text-blue-600">Mate</span>
              </h2>
              <p className="text-[10px] font-medium text-slate-400">
                Academic Management
              </p>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:block"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Profile */}
        <div
          className={`mx-3 mt-5 rounded-xl bg-slate-50 p-3 ${
            sidebarCollapsed ? "flex justify-center" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {facultyName.charAt(0).toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">
                  {facultyName}
                </p>
                <p className="text-[10px] text-slate-500">Faculty</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
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
                      className={`
                        group flex w-full items-center gap-3 rounded-xl
                        px-3 py-2.5 text-left text-xs font-semibold
                        transition-all duration-200
                        ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }
                        ${sidebarCollapsed ? "justify-center" : ""}
                      `}
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

                          {item.id === "announcements" &&
                            announcements.length > 0 && (
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

        {/* Sidebar Footer */}
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
              ClassMate Â© 2026
            </p>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {pageTitles[activePage]}
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Manage your academic activities and course resources.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <CalendarDays size={15} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">
                Fall Semester 2026
              </span>
            </div>

            <button
              onClick={() => navigate("announcements")}
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            >
              <Bell size={19} />
              {announcements.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-blue-600" />
              )}
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
              F
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
          {/* Toast */}
          {toast && (
            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
              <span>{toast}</span>
              <button onClick={() => setToast("")}>
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
                      <Sparkles size={13} />
                      FACULTY WORKSPACE
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                      Welcome back, {facultyName}!
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                      Manage your courses, share learning materials,
                      communicate with students, and organize presentations
                      from one place.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <UserRound size={14} className="text-blue-600" />
                        Faculty Member
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-blue-600" />
                        Fall Semester 2026
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => {
                        navigate("notes");
                        openModal("notes");
                      }}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Upload size={16} />
                      Upload Notes
                    </button>

                    <button
                      onClick={() => navigate("presentations")}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Presentation size={16} className="text-blue-600" />
                      Presentations
                    </button>
                  </div>
                </div>
              </section>

              {/* Statistics */}
              <section>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Workspace Overview
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Your academic management activity at a glance.
                  </p>
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
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[stat.color]}`}
                          >
                            <Icon size={20} />
                          </div>
                          <ArrowUpRight size={17} className="text-slate-300" />
                        </div>

                        <div className="mt-5">
                          <p className="text-xs font-medium text-slate-500">
                            {stat.title}
                          </p>
                          <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
                            {stat.value}
                          </h3>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {stat.subtitle}
                          </p>
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

              {/* Dashboard Grid */}
              <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  {/* Quick Actions */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-slate-900">
                        Quick Actions
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Frequently used academic management tools.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          title: "Upload Course Notes",
                          description: "Share PDFs and lecture materials.",
                          icon: FileText,
                          action: () => {
                            navigate("notes");
                            openModal("notes");
                          },
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
                          title: "Presentations",
                          description: "Manage seminar topics and presentations.",
                          icon: Presentation,
                          action: () => navigate("presentations"),
                        },
                      ].map((action) => {
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
                            <h4 className="text-xs font-bold text-slate-800">
                              {action.title}
                            </h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                              {action.description}
                            </p>
                            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                              Get started <ChevronRight size={13} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Notes */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Recently Uploaded Notes
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Latest learning resources.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate("notes")}
                        className="text-xs font-bold text-blue-600"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-3">
                      {notes.slice(0, 3).map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 sm:p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <FileText size={19} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="truncate text-xs font-bold text-slate-800">
                                {note.title}
                              </h4>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {note.course} Â· {note.date}
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

                {/* Right Column */}
                <div className="space-y-6 xl:col-span-4">
                  <div className="rounded-2xl bg-slate-900 p-6 text-white">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                      <Sparkles size={22} />
                    </div>

                    <h3 className="mt-4 text-base font-bold">
                      AI Presentation Assistant
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Manage presentation topics, subtopics, research ideas,
                      and seminar activities.
                    </p>

                    <button
                      onClick={() => navigate("presentations")}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold transition hover:bg-blue-700"
                    >
                      Open Presentations
                      <ArrowUpRight size={15} />
                    </button>
                  </div>

                  {/* Recent Announcements */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Recent Announcements
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Latest course broadcasts.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate("announcements")}
                        className="text-xs font-bold text-blue-600"
                      >
                        View all
                      </button>
                    </div>

                    <div className="space-y-4">
                      {announcements.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No announcements available.
                        </p>
                      ) : (
                        announcements.slice(0, 3).map((item) => (
                          <div
                            key={item._id}
                            className="border-l-2 border-blue-500 pl-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-800">
                                {item.title}
                              </h4>
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${getPriorityStyle(item.priority)}`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                              {item.description}
                            </p>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : "Recently"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Course Notes */}
          {activePage === "notes" && (
            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Course Notes & Materials
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage learning resources for your students.
                  </p>
                </div>

                <button
                  onClick={() => openModal("notes")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={16} /> Upload Note
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText size={21} />
                      </div>

                      <button
                        onClick={() => {
                          setNotes((prev) =>
                            prev.filter((item) => item.id !== note.id),
                          );
                          showToast("Note removed from demo list.");
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete note"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-900">
                      {note.title}
                    </h3>

                    <p className="mt-2 text-xs text-slate-500">
                      {note.course} Â· {note.date}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-[11px] text-slate-400">
                        {note.size}
                      </span>
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
                        PDF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Announcements */}
          {activePage === "announcements" && (
            <section className="space-y-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Course Announcements
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Communicate important academic updates with students.
                  </p>
                </div>

                <button
                  onClick={() => openModal("announcements")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={16} /> New Announcement
                </button>
              </div>

              <div className="space-y-3">
                {announcementLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm text-slate-500">
                      Loading announcements...
                    </p>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <Bell size={28} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-sm font-bold text-slate-700">
                      No Announcements Yet
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Create your first course announcement.
                    </p>
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                              {item.course}
                            </span>

                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${getPriorityStyle(item.priority)}`}
                            >
                              {item.priority} Priority
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">
                            {item.title}
                          </h3>

                          <p className="mt-2 text-xs leading-relaxed text-slate-500">
                            {item.description}
                          </p>

                          <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={12} />
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "Recently"}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            handleDeleteAnnouncement(item._id)
                          }
                          className="self-end rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:self-start"
                          title="Delete announcement"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Mini Academic Calendar */}
          {activePage === "calendar" && <AcademicCalendar role="faculty" />}

          {/* Presentations */}
          {activePage === "presentations" && <PresentationComponent />}

          {/* Quiz Bank */}
          {activePage === "quizzes" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Brain size={28} />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                Community Quiz Bank
              </h2>

              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                Access and manage quiz questions contributed by your academic
                community.
              </p>

              <button
                onClick={() =>
                  showToast("Quiz Bank integration is coming soon.")
                }
                className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Explore Quiz Bank
              </button>
            </section>
          )}
        </main>
      </div>

      {/* Create Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {modal === "notes"
                    ? "Upload Course Note"
                    : "Create Announcement"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Fill in the information below.
                </p>
              </div>

              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Target Course
                </label>

                <select
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="CSE 412">CSE 412 - Machine Learning</option>
                  <option value="CSE 321">CSE 321 - Operating Systems</option>
                  <option value="CSE 331">CSE 331 - Database Systems</option>
                  <option value="CSE 421">CSE 421 - Cloud Computing</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {modal === "notes" ? "Note Title" : "Announcement Title"}
                </label>

                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter a title..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {modal === "announcements" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Priority
                  </label>

                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  required={modal === "announcements"}
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Write a short description..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
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
                    ? "Publishing..."
                    : modal === "notes"
                      ? "Add Note"
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


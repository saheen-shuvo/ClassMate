/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Presentation,
  BookOpen,
  Bell,
  ClipboardList,
  UserRound,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  CalendarDays,
  ArrowUpRight,
  RefreshCw,
  Pencil,
  ShieldCheck,
  Mail,
  Clock,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getCurrentUser,
  logoutUser,
  updateProfile,
  getAdminOverview,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  dashboardForRole,
} from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const roleLabels = {
  student: "Student",
  cr: "Class Representative",
  faculty: "Faculty",
  admin: "Admin",
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "student",
  studentId: "",
};

export default function AdminDashboardPage() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [profileForm, setProfileForm] = useState({ name: "", studentId: "" });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [overviewData, usersData] = await Promise.all([getAdminOverview(), getAdminUsers()]);
      setOverview(overviewData);
      setUsers(usersData);

      const [announcementResponse, assignmentResponse] = await Promise.all([
        fetch(`${API_URL}/api/announcements`, { credentials: "include" }),
        fetch(`${API_URL}/api/assignments`, { credentials: "include" }),
      ]);
      setAnnouncements(announcementResponse.ok ? await announcementResponse.json() : []);
      setAssignments(assignmentResponse.ok ? await assignmentResponse.json() : []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.role !== "admin") {
          window.location.href = dashboardForRole(data.user.role);
          return;
        }
        setUser(data.user);
        setProfileForm({ name: data.user.name || "", studentId: data.user.studentId || "" });
      })
      .catch(() => { window.location.href = "/login"; });

    const hash = window.location.hash.replace("#", "");
    if (["overview", "users", "students", "faculty", "cr", "announcements", "assignments", "profile"].includes(hash))
      setActivePage(hash);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const navigate = (page) => {
    setActivePage(page);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, "", `#${page}`);
  };

  const initials = (name) =>
    String(name || "Admin").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Log out?",
      text: "Are you sure you want to log out?",
      showCancelButton: true,
      confirmButtonText: "Yes, log out",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    await logoutUser();
    window.location.href = "/login";
  };

  const openCreate = () => {
    setUserForm(emptyUserForm);
    setModal("create");
  };

  const openEdit = (account) => {
    setUserForm({
      id: account._id,
      name: account.name || "",
      email: account.email || "",
      password: "",
      role: account.role,
      studentId: account.studentId || "",
      active: account.active !== false,
    });
    setModal("edit");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (modal === "create") {
        await createAdminUser(userForm);
        await Swal.fire({ icon: "success", title: "Account created", confirmButtonColor: "#2563eb" });
      } else {
        await updateAdminUser(userForm.id, userForm);
        await Swal.fire({ icon: "success", title: "Account updated", confirmButtonColor: "#2563eb" });
      }
      setModal(null);
      await loadData();
    } catch (requestError) {
      await Swal.fire({ icon: "error", title: "Could not save account", text: requestError.message, confirmButtonColor: "#2563eb" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (account) => {
    const activating = account.active === false;
    const result = await Swal.fire({
      icon: "question",
      title: activating ? "Activate account?" : "Disable account?",
      text: `${account.name} will ${activating ? "be able to log in" : "no longer be able to log in"}.`,
      showCancelButton: true,
      confirmButtonText: activating ? "Activate" : "Disable",
      confirmButtonColor: activating ? "#2563eb" : "#dc2626",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await updateAdminUser(account._id, { active: activating });
      await loadData();
    } catch (requestError) {
      await Swal.fire({ icon: "error", title: "Action failed", text: requestError.message, confirmButtonColor: "#2563eb" });
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const data = await updateProfile(profileForm);
      setUser(data.user);
      await Swal.fire({ icon: "success", title: "Profile updated", confirmButtonColor: "#2563eb" });
    } catch (requestError) {
      await Swal.fire({ icon: "error", title: "Profile update failed", text: requestError.message, confirmButtonColor: "#2563eb" });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const role = activePage === "students" ? "student" : activePage === "faculty" ? "faculty" : activePage === "cr" ? "cr" : roleFilter;
    return users.filter((account) => {
      const matchesSearch = !query || account.name?.toLowerCase().includes(query) || account.email?.toLowerCase().includes(query);
      const matchesRole = role === "all" || account.role === role;
      return matchesSearch && matchesRole;
    });
  }, [activePage, roleFilter, search, users]);

  const navGroups = [
    { title: "WORKSPACE", items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }] },
    { title: "ADMINISTRATION", items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "students", label: "Students", icon: GraduationCap },
      { id: "faculty", label: "Faculty", icon: Presentation },
      { id: "cr", label: "Class Representatives", icon: ShieldCheck },
    ] },
    { title: "CONTENT", items: [
      { id: "announcements", label: "Announcements", icon: Bell },
      { id: "assignments", label: "Assignments", icon: ClipboardList },
      { id: "profile", label: "Profile", icon: UserRound },
    ] },
  ];

  const roleCards = [
    { title: "Total Users", value: overview?.counts?.totalUsers, icon: Users, color: "blue" },
    { title: "Students", value: overview?.counts?.students, icon: GraduationCap, color: "emerald" },
    { title: "Faculty", value: overview?.counts?.faculty, icon: Presentation, color: "indigo" },
    { title: "CRs", value: overview?.counts?.crs, icon: ShieldCheck, color: "purple" },
    { title: "Administrators", value: overview?.counts?.admins, icon: UserRound, color: "amber" },
  ];

  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  if (loading && !overview) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[1,2,3,4,5].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all ${sidebarCollapsed ? "w-19" : "w-65"} ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="flex h-18 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          {!sidebarCollapsed && <div><h2 className="text-base font-extrabold text-slate-900">Class<span className="text-blue-600">Mate</span></h2><p className="text-[10px] text-slate-400">Administration</p></div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:block" aria-label="Toggle sidebar">{sidebarCollapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
          <button onClick={() => setMobileSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 lg:hidden" aria-label="Close sidebar"><X size={19}/></button>
        </div>
        <div className={`mx-3 mt-5 rounded-xl bg-slate-50 p-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials(user?.name)}</div>{!sidebarCollapsed && <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{user?.name || "Admin"}</p><p className="text-[10px] text-slate-500">Administrator</p></div>}</div>
        </div>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3">
          {navGroups.map((group) => <div key={group.title}>{!sidebarCollapsed && <p className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400">{group.title}</p>}<div className="space-y-1">{group.items.map((item) => {const Icon=item.icon;const active=activePage===item.id;return <button key={item.id} onClick={() => navigate(item.id)} title={sidebarCollapsed ? item.label : ""} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${active ? "bg-blue-50 text-blue-700":"text-slate-500 hover:bg-slate-50"} ${sidebarCollapsed ? "justify-center":""}`}><Icon size={18}/>{!sidebarCollapsed && <span className="flex-1">{item.label}</span>}</button>})}</div></div>)}
        </nav>
        <div className="border-t border-slate-100 p-3"><button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"><LogOut size={18}/>{!sidebarCollapsed && "Logout"}</button></div>
      </aside>

      <div className={`min-h-screen ${sidebarCollapsed ? "lg:ml-19" : "lg:ml-65"}`}>
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileSidebarOpen(true)} className="rounded-lg p-2 lg:hidden" aria-label="Open sidebar"><Menu size={21}/></button><div><h1 className="text-base font-bold text-slate-900 sm:text-lg">{navGroups.flatMap(g=>g.items).find(i=>i.id===activePage)?.label || "Overview"}</h1><p className="hidden text-xs text-slate-400 sm:block">Administrator control center</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex"><CalendarDays size={15} className="text-slate-400"/><span className="text-xs font-medium text-slate-600">{new Date().toLocaleDateString()}</span></div><span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 sm:inline">ADMIN</span><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials(user?.name)}</div></div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          {error && <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={loadData} className="ml-3 font-bold">Try again</button></div>}

          {activePage === "overview" && <>
            <section className="rounded-2xl border border-blue-100 bg-white p-6 sm:p-8"><p className="mb-3 text-[10px] font-bold text-blue-700">ADMIN WORKSPACE</p><h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Welcome back, {user?.name || "Admin"}!</h2><p className="mt-2 text-sm text-slate-500">{user?.name} · {roleLabels[user?.role] || "Administrator"}</p></section>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{roleCards.map(card=>{const Icon=card.icon;return <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorStyles[card.color]}`}><Icon size={20}/></div><p className="mt-5 text-xs text-slate-500">{card.title}</p><p className="mt-1 text-3xl font-extrabold text-slate-900">{String(card.value ?? 0).padStart(2,"0")}</p></div>})}</div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-bold text-slate-900">Recently Registered Users</h3><div className="mt-4 space-y-3">{overview?.recentUsers?.length ? overview.recentUsers.map(account=> <div key={account._id} className="flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="text-xs font-bold text-slate-800">{account.name}</p><p className="text-[11px] text-slate-400">{account.email}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{roleLabels[account.role]}</span></div>) : <p className="text-xs text-slate-400">No registered users.</p>}</div></section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-bold text-slate-900">Recent Announcements</h3><div className="mt-4 space-y-3">{overview?.recentAnnouncements?.length ? overview.recentAnnouncements.map(item=> <div key={item._id} className="border-b border-slate-100 pb-3"><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] text-slate-400">{item.course || "General"} · {formatDate(item.createdAt)}</p></div>) : <p className="text-xs text-slate-400">No announcements.</p>}</div></section>
            </div>
          </>}

          {["users","students","faculty","cr"].includes(activePage) && <section className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-slate-900">{activePage==="users" ? "User Management" : activePage==="students" ? "Students" : activePage==="faculty" ? "Faculty" : "Class Representatives"}</h2><p className="mt-1 text-xs text-slate-500">Manage accounts stored in the MongoDB users collection.</p></div><button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"><Plus size={15}/>Create account</button></div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search size={16} className="text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email..." className="w-full bg-transparent text-xs outline-none"/></label>{activePage==="users" && <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="all">All roles</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="cr">CRs</option><option value="admin">Admins</option></select>}</div>
            {loading ? <div className="h-64 animate-pulse rounded-2xl bg-slate-200"/> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-190 text-left"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Student ID</th><th className="px-5 py-4">Registered</th><th className="px-5 py-4">Actions</th></tr></thead><tbody>{filteredUsers.length ? filteredUsers.map(account=><tr key={account._id} className="border-b border-slate-50 last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{initials(account.name)}</div><div><p className="text-xs font-bold text-slate-800">{account.name}</p>{account.active===false && <span className="text-[10px] font-bold text-rose-600">Disabled</span>}</div></div></td><td className="px-5 py-4 text-xs text-slate-500">{account.email}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{roleLabels[account.role]}</span></td><td className="px-5 py-4 text-xs text-slate-500">{account.studentId || "—"}</td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(account.createdAt)}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>openEdit(account)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700" title="Edit user"><Pencil size={15}/></button><button onClick={()=>toggleActive(account)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${account.active===false?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-600"}`}>{account.active===false?"Activate":"Disable"}</button></div></td></tr>):<tr><td colSpan="6" className="px-5 py-10 text-center text-xs text-slate-400">No matching users.</td></tr>}</tbody></table></div>}
          </section>}

          {activePage==="announcements" && <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">Announcements</h2><p className="mt-1 text-xs text-slate-500">Recent MongoDB announcements.</p></div>{announcements.length ? announcements.map(item=><article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-900">{item.title}</p><p className="mt-2 text-xs text-slate-500">{item.description}</p><p className="mt-3 text-[10px] text-slate-400">{item.course || "General"} · {formatDate(item.createdAt)}</p></article>):<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-400">No announcements.</div>}</section>}
          {activePage==="assignments" && <section className="space-y-4"><div><h2 className="text-lg font-bold text-slate-900">Assignments</h2><p className="mt-1 text-xs text-slate-500">Recent MongoDB assignments.</p></div>{assignments.length ? assignments.map(item=><article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-bold text-slate-900">{item.title}</p><p className="mt-2 text-xs text-slate-500">{item.description}</p><p className="mt-3 text-[10px] text-slate-400">{item.course} · Due {formatDate(item.dueDate)}</p></article>):<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-400">No assignments.</div>}</section>}
          {activePage==="profile" && <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-4 border-b border-slate-100 pb-6"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">{initials(user?.name)}</div><div><h2 className="text-base font-bold text-slate-900">{user?.name}</h2><p className="mt-1 text-xs text-slate-500">{roleLabels[user?.role]}</p></div></div><dl className="grid gap-4 py-6 sm:grid-cols-2"><div><dt className="text-[10px] font-bold uppercase text-slate-400">Email</dt><dd className="mt-1 text-sm text-slate-700">{user?.email}</dd></div><div><dt className="text-[10px] font-bold uppercase text-slate-400">Registered</dt><dd className="mt-1 text-sm text-slate-700">{formatDate(user?.createdAt)}</dd></div></dl><form onSubmit={saveProfile} className="space-y-4"><div><label className="mb-2 block text-xs font-bold text-slate-600">Full name</label><input value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></div><div><label className="mb-2 block text-xs font-bold text-slate-600">Student ID</label><input value={profileForm.studentId} onChange={e=>setProfileForm({...profileForm,studentId:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></div><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{saving?"Saving...":"Save profile"}</button></form></section>}
        </main>
      </div>

      {modal && <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={saveUser} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900">{modal==="create"?"Create account":"Edit account"}</h2><button type="button" onClick={()=>setModal(null)} className="text-slate-400"><X size={18}/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Name<input value={userForm.name} onChange={e=>setUserForm({...userForm,name:e.target.value})} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-bold text-slate-600">Email<input type="email" value={userForm.email} onChange={e=>setUserForm({...userForm,email:e.target.value})} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label><label className="text-xs font-bold text-slate-600">Role<select value={userForm.role} onChange={e=>setUserForm({...userForm,role:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"><option value="student">Student</option><option value="faculty">Faculty</option><option value="cr">CR</option><option value="admin">Admin</option></select></label><label className="text-xs font-bold text-slate-600">Student ID<input value={userForm.studentId} onChange={e=>setUserForm({...userForm,studentId:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label><label className="sm:col-span-2 text-xs font-bold text-slate-600">{modal==="create"?"Password":"New password (optional)"}<input type="password" value={userForm.password} onChange={e=>setUserForm({...userForm,password:e.target.value})} required={modal==="create"} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal"/></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">{saving?"Saving...":"Save"}</button></div></form></div>}
    </div>
  );
}

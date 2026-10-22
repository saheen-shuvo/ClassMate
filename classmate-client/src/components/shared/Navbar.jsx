/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import logo from "../../../public/logo.png";

import {
  FiBookOpen,
  FiFileText,
  FiUsers,
  FiBell,
  FiLayers,
  FiUser,
  FiLogOut,
  FiSettings,
  FiMenu,
  FiX,
  FiChevronDown,
  FiLayout,
} from "react-icons/fi";

export default function Navbar({ user: initialUser = null, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(initialUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef(null);

  const role = user?.role?.toLowerCase();

  // Role-specific dashboard routes.
  const dashboardPath = {
    student: "/dashboard/student",
    cr: "/dashboard/cr",
    faculty: "/dashboard/faculty",
    admin: "/dashboard/admin",
  };

  const dashboardHref = dashboardPath[role] || "/dashboard";

  // General navigation links.
  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: FiLayout,
    },
    {
      label: "Courses",
      href: "/courses",
      icon: FiBookOpen,
    },
    {
      label: "Notes",
      href: "/notes",
      icon: FiFileText,
    },
    {
      label: "Presentations",
      href: "/presentation-topics",
      icon: FiLayers,
    },
    {
      label: "Announcements",
      href: "/announcements",
      icon: FiBell,
    },
    {
      label: "Team Matcher",
      href: "/team-matcher",
      icon: FiUsers,
      protected: true,
    },
  ];

  // Links visible according to the logged-in user's role.
  const roleItems = {
    student: [],

    cr: [
      {
        label: "Manage Courses",
        href: "/dashboard/cr/courses",
      },
      {
        label: "Manage Notes",
        href: "/dashboard/cr/notes",
      },
      {
        label: "Manage Announcements",
        href: "/dashboard/cr/announcements",
      },
    ],

    faculty: [
      {
        label: "Manage Courses",
        href: "/dashboard/faculty/courses",
      },
      {
        label: "Manage Announcements",
        href: "/dashboard/faculty/announcements",
      },
    ],

    admin: [
      {
        label: "Manage Students",
        href: "/dashboard/admin/students",
      },
      {
        label: "Manage CRs",
        href: "/dashboard/admin/crs",
      },
      {
        label: "Manage Courses",
        href: "/dashboard/admin/courses",
      },
    ],
  };

  // Read the current demo login from localStorage.
  const syncUser = () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedRole = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");

    if (!isLoggedIn || !storedRole || !email) {
      setUser(null);
      return;
    }

    const roleNames = {
      cr: "Class Representative",
      student: "Student",
      faculty: "Faculty",
      admin: "Admin",
    };

    setUser({
      role: storedRole,
      email,
      userName: roleNames[storedRole] || "User",
    });
  };

  useEffect(() => {
    syncUser();

    // Listen for login/logout changes within this tab.
    window.addEventListener("auth-change", syncUser);

    // Also listen for localStorage changes from another tab.
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  // Close menus when navigating to another page.
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const linkClass = (href) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
    }`;

  // Show only links available to the current account.
  const visibleItems = navItems.filter(
    (item) => !item.protected || Boolean(user)
  );

  // Logout.
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

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Call an existing authentication logout handler if provided.
      if (onLogout) {
        await onLogout();
      }

      // Clear the demo login.
      localStorage.removeItem("userRole");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isLoggedIn");

      setUser(null);
      closeMenus();

      // Synchronize other components in this tab.
      window.dispatchEvent(new Event("auth-change"));

      await Swal.fire({
        icon: "success",
        title: "Logged out!",
        text: "You have successfully logged out.",
        confirmButtonColor: "#4f46e5",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);

      Swal.fire({
        icon: "error",
        title: "Logout failed",
        text: "Please try again.",
        confirmButtonColor: "#4f46e5",
      });
    }
  };

  const displayName =
    user?.userName || user?.name || "My Account";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={closeMenus}
            className="flex shrink-0 items-center gap-2"
          >
            <Image
              src={logo}
              alt="ClassMate"
              width={36}
              height={36}
              priority
            />

            <span className="text-xl font-bold tracking-tight text-slate-900">
              Class<span className="text-indigo-600">Mate</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {visibleItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    isActive(item.href) ? "page" : undefined
                  }
                  className={linkClass(item.href)}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Account actions */}
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() =>
                    setUserMenuOpen((prev) => !prev)
                  }
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open account menu"
                  className="flex items-center gap-2 rounded-full border border-slate-200 p-1.5 pr-3 transition hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                    {displayName.charAt(0).toUpperCase()}
                  </span>

                  <span className="hidden max-w-24 truncate text-sm font-medium text-slate-700 sm:block">
                    {displayName}
                  </span>

                  <FiChevronDown size={16} />
                </button>

                {/* Account dropdown */}
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                  >
                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {user.email || ""}
                      </p>

                      <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs capitalize text-indigo-700">
                        {role === "cr"
                          ? "Class Representative"
                          : role || "Member"}
                      </span>
                    </div>

                    <Link
                      href={dashboardHref}
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FiLayout size={17} />
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FiUser size={17} />
                      My Profile
                    </Link>

                    {(roleItems[role] || []).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FiSettings size={17} />
                        {item.label}
                      </Link>
                    ))}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiLogOut size={17} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Log in
                </Link>

                <Link
                  href="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 lg:hidden"
            >
              {mobileOpen ? (
                <FiX size={23} />
              ) : (
                <FiMenu size={23} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {mobileOpen && (
          <div className="border-t border-slate-200 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    aria-current={
                      isActive(item.href) ? "page" : undefined
                    }
                    className={linkClass(item.href)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}

              {user ? (
                <>
                  <div className="my-2 border-t border-slate-200" />

                  {/* Mobile account information */}
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {displayName}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs capitalize text-indigo-700">
                      {role === "cr"
                        ? "Class Representative"
                        : role}
                    </span>
                  </div>

                  <Link
                    href={dashboardHref}
                    onClick={closeMenus}
                    className={linkClass(dashboardHref)}
                  >
                    <FiLayout size={18} />
                    Dashboard
                  </Link>

                  <Link
                    href="/profile"
                    onClick={closeMenus}
                    className={linkClass("/profile")}
                  >
                    <FiUser size={18} />
                    My Profile
                  </Link>

                  {(roleItems[role] || []).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenus}
                      className={linkClass(item.href)}
                    >
                      <FiSettings size={18} />
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <FiLogOut size={18} />
                    Logout
                  </button>
                </>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                  <Link
                    href="/login"
                    onClick={closeMenus}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/register"
                    onClick={closeMenus}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

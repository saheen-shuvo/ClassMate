"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser } from "@/lib/auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data.user.role !== "admin") {
          router.push(data.user.role === "student" ? "/dashboard/student" : data.user.role === "cr" ? "/dashboard/cr" : data.user.role === "faculty" ? "/dashboard/faculty" : "/login");
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          {user ? `Signed in as ${user.name || user.email}` : "Validating your session..."}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white"
        >
          Logout
        </button>
      </div>
    </main>
  );
}

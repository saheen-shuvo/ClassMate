/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Connect your authentication API here.
    console.log("Login form submitted:", {
      ...formData,
      rememberMe,
    });
  };

  return (
    <main className="min-h-screen bg-white px-5 py-12 sm:px-6">
      <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center">

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to access your university learning space.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              University email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-900"
              >
                {showPassword ? (
                  <FiEyeOff size={18} />
                ) : (
                  <FiEye size={18} />
                )}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-700"
            />
            Remember me
          </label>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Sign in
            <FiArrowRight size={17} />
          </button>
        </form>

        {/* Registration link */}
        <p className="mt-7 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            Create an account
          </Link>
        </p>

        <p className="mt-10 text-center text-xs leading-5 text-slate-500">
          By signing in, you agree to use ClassMate responsibly within your
          university community.
        </p>

        <Link
          href="/"
          className="mt-6 self-center text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
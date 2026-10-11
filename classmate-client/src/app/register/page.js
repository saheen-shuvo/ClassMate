"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiEye,
  FiEyeOff,
  FiArrowRight,
} from "react-icons/fi";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    studentId: "",
    role: "student",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Connect your Express.js registration API here.
    console.log("Registration form submitted:", {
      fullName: formData.fullName,
      email: formData.email,
      studentId: formData.studentId,
      role: formData.role,
      password: formData.password,
    });
  };

  return (
    <main className="min-h-screen bg-white px-5 py-12 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col justify-center">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Join your university community and start collaborating.
          </p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
            />
          </div>

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
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
            />
          </div>

          <div>
            <label
              htmlFor="studentId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Student ID
            </label>

            <input
              id="studentId"
              name="studentId"
              type="text"
              autoComplete="off"
              placeholder="Enter your student ID"
              value={formData.studentId}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Account type
            </label>

            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
            >
              <option value="student">Student</option>
              <option value="cr">Class Representative (CR)</option>
            </select>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              CR accounts should be verified by a university administrator.
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? (
                  <FiEyeOff size={18} />
                ) : (
                  <FiEye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/10"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-900"
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={18} />
                ) : (
                  <FiEye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            Create account
            <FiArrowRight size={17} />
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            Sign in
          </Link>
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
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignIn } from "@/supabase/auth";
import { useIsAdmin, checkEmailIsAdmin } from "@/hooks/use-is-admin";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { isAdmin, isAdminLoading } = useIsAdmin();

  useEffect(() => {
    if (!isUserLoading && !isAdminLoading && user) {
      if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        setError("Access denied. This account does not have admin privileges.");
      }
    }
  }, [user, isUserLoading, isAdmin, isAdminLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Pre-check if email belongs to an admin in the database
      const emailIsAdmin = await checkEmailIsAdmin(supabase, email);
      if (!emailIsAdmin) {
        setError("Access denied. This email is not registered as an admin.");
        setLoading(false);
        return;
      }

      await initiateEmailSignIn(supabase, email, password);
      // Auth state change will redirect via useEffect
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.message?.includes("Invalid login credentials")) {
        setError("Incorrect email or password.");
      } else if (err.message?.includes("Email not confirmed")) {
        setError("Your email is not yet confirmed. Check your inbox.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f9f9f9] dark:bg-[#050505]">
      <div className="bg-white dark:bg-white/[0.03] rounded-[32px] p-8 md:p-12 w-full max-w-[480px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02]">
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <div className="p-4 rounded-2xl bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <Link
              href="/"
              className="inline-block font-headline italic font-normal text-4xl text-black dark:text-white tracking-[-0.05em]"
            >
              E-Moorm
            </Link>
            <p className="text-muted-foreground text-sm font-normal">
              Admin Panel — Authorized access only
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl p-4 text-red-600 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold tracking-tight text-muted-foreground ml-1">
              Admin email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={loading}
              className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-4 text-black dark:text-white placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold tracking-tight text-muted-foreground ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-4 text-black dark:text-white placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white font-bold py-5 rounded-full hover:bg-primary transition-all transform active:scale-[0.98] shadow-md text-sm tracking-tight mt-2 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Sign In as Admin
              </>
            )}
          </button>
        </form>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-xs font-bold tracking-tight text-muted-foreground/60 hover:text-black dark:hover:text-white transition-all mt-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

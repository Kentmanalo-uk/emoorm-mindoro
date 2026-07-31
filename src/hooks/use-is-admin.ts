"use client";

import { useState, useEffect } from "react";
import { useUser, useSupabase } from "@/supabase";

/**
 * Hook that checks if the current authenticated user has the 'admin' role
 * in the database `users` table, instead of relying on a hardcoded email list.
 *
 * Returns { isAdmin, isAdminLoading } so pages can gate content accordingly.
 */
export function useIsAdmin() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user!.uid)
          .single();

        if (!cancelled) {
          if (error || !data) {
            setIsAdmin(false);
          } else {
            setIsAdmin(data.role === "admin");
          }
          setIsAdminLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, supabase]);

  return { isAdmin, isAdminLoading, user };
}

/**
 * Checks the database to see if a given email belongs to an admin user.
 * Used during login to validate before attempting sign-in.
 */
export async function checkEmailIsAdmin(
  supabase: ReturnType<typeof useSupabase>,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) return false;
  return data.role === "admin";
}

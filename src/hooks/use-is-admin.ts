"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useUser, useSupabase } from "@/supabase";

export type AdminRole = "admin" | "municipal_admin" | null;

function logSupabaseError(scope: string, err: unknown) {
  if (!err) return;
  const e = err as any;
  console.error(`[${scope}]`, {
    message: e.message ?? String(err),
    code: e.code,
    details: e.details,
    hint: e.hint,
    status: e.status,
  });
}

async function fetchScopeForUid(
  supabase: SupabaseClient,
  uid: string,
): Promise<{ role: AdminRole; municipality: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("role, municipality")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    logSupabaseError("useIsAdmin.select", error);
    return { role: null, municipality: null };
  }
  const role = (data?.role as string) ?? null;
  if (role === "admin") return { role: "admin", municipality: null };
  if (role === "municipal_admin") {
    return {
      role: "municipal_admin",
      municipality: (data?.municipality as string) ?? null,
    };
  }
  return { role: null, municipality: null };
}

/**
 * Backwards-compatible admin hook.
 * - `isAdmin` is true for BOTH general and municipal admins (any admin access).
 * - `isSuperAdmin` is true only for the general (platform) admin.
 * - `isMunicipalAdmin` is true only for municipality-scoped admins.
 * - `municipality` is the scoped admin's assigned municipality, else null.
 */
export function useIsAdmin() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const [role, setRole] = useState<AdminRole>(null);
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isUserLoading) {
      setIsAdminLoading(true);
      return;
    }

    if (!user) {
      setRole(null);
      setMunicipality(null);
      setIsAdminLoading(false);
      return;
    }

    setIsAdminLoading(true);
    (async () => {
      const scope = await fetchScopeForUid(supabase, user.uid);
      if (cancelled) return;
      setRole(scope.role);
      setMunicipality(scope.municipality);
      setIsAdminLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, supabase]);

  const isSuperAdmin = role === "admin";
  const isMunicipalAdmin = role === "municipal_admin";
  const isAdmin = isSuperAdmin || isMunicipalAdmin;

  return {
    isAdmin,
    isSuperAdmin,
    isMunicipalAdmin,
    role,
    municipality,
    isAdminLoading,
    user,
  };
}

export async function checkEmailIsAdmin(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  if (!email) return false;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) {
      logSupabaseError("checkEmailIsAdmin", error);
      return false;
    }
    return data?.role === "admin" || data?.role === "municipal_admin";
  } catch (err) {
    logSupabaseError("checkEmailIsAdmin.exception", err);
    return false;
  }
}

/**
 * Normalize a raw municipality string for comparison.
 * Trims whitespace, lowercases, and strips trailing " City" so that
 * "Calapan City" and "Calapan" match the same admin scope.
 */
export function normalizeMunicipality(input?: string | null): string {
  if (!input) return "";
  return input.trim().toLowerCase().replace(/\s+city$/i, "").trim();
}

/**
 * Given a municipal admin's assigned municipality and a store's own
 * municipality / city fields, decide whether that admin has jurisdiction.
 */
export function storeInMunicipality(
  store: { municipality?: string | null; city?: string | null } | null | undefined,
  scope: string | null | undefined,
): boolean {
  if (!store || !scope) return false;
  const target = normalizeMunicipality(scope);
  if (!target) return false;
  return (
    normalizeMunicipality(store.municipality) === target ||
    normalizeMunicipality(store.city) === target
  );
}

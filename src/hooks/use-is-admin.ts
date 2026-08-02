"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useUser, useSupabase } from "@/supabase";

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

async function fetchRoleForUid(
  supabase: SupabaseClient,
  uid: string,
): Promise<{ isAdmin: boolean; role: string | null }> {
  const rpc = await supabase.rpc("is_admin", { uid });
  if (!rpc.error) {
    return {
      isAdmin: rpc.data === true,
      role: rpc.data === true ? "admin" : null,
    };
  }
  const rpcErr = rpc.error as any;
  const missingFn =
    rpcErr?.code === "PGRST202" ||
    rpcErr?.status === 404 ||
    /function .* does not exist/i.test(rpcErr?.message || "");
  if (!missingFn) {
    logSupabaseError("useIsAdmin.rpc", rpc.error);
  }

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    logSupabaseError("useIsAdmin.select", error);
    return { isAdmin: false, role: null };
  }
  return { isAdmin: data?.role === "admin", role: data?.role ?? null };
}

export function useIsAdmin() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isUserLoading) {
      setIsAdminLoading(true);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    setIsAdminLoading(true);
    (async () => {
      const { isAdmin: adminFlag } = await fetchRoleForUid(supabase, user.uid);
      if (cancelled) return;
      setIsAdmin(adminFlag);
      setIsAdminLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, supabase]);

  return { isAdmin, isAdminLoading, user };
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
    return data?.role === "admin";
  } catch (err) {
    logSupabaseError("checkEmailIsAdmin.exception", err);
    return false;
  }
}

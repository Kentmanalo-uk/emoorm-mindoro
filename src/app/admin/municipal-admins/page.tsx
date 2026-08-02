"use client";

import React, { useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  useSupabase,
  useSupabaseAuth,
  useStableMemo,
  useCollection,
} from "@/supabase";
import { MINDORO_CITIES } from "@/lib/mindoro-cities-data";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ShieldCheck,
  MapPin,
  Mail,
  Trash2,
  Ban,
  RotateCcw,
  X,
  Search,
} from "lucide-react";

type MunicipalAdmin = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  municipality?: string | null;
  disabledAt?: string | null;
  createdAt?: string | null;
};

export default function MunicipalAdminsPage() {
  const { user } = useSupabaseAuth();
  const { isSuperAdmin, isAdminLoading } = useIsAdmin();
  const supabase = useSupabase();
  const { toast } = useToast();

  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    municipality: MINDORO_CITIES[0]?.displayName ?? "",
  });

  const listConfig = useStableMemo(() => {
    if (!user || !isSuperAdmin) return null;
    return {
      table: "users",
      filters: [
        { column: "role", op: "eq" as const, value: "municipal_admin" },
      ],
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isSuperAdmin, refreshTick]);
  const { data: admins, isLoading } = useCollection(listConfig);

  const filtered = useMemo(() => {
    const list = (admins ?? []) as MunicipalAdmin[];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (a) =>
        (a.email || "").toLowerCase().includes(q) ||
        (a.municipality || "").toLowerCase().includes(q) ||
        `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase().includes(q),
    );
  }, [admins, search]);

  if (isAdminLoading) {
    return (
      <AdminLayout>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  // Non-super admins are redirected by AdminScopeGuard; render nothing to be safe.
  if (!isSuperAdmin) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const email = form.email.trim().toLowerCase();
    const municipality = form.municipality.trim();
    if (!email || !municipality) {
      toast({
        title: "Missing fields",
        description: "Email and municipality are required.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      // Look up existing user by email (case-insensitive). If found, upgrade
      // their role. Otherwise create a placeholder row.
      const lookup = await supabase
        .from("users")
        .select("id, role, email")
        .ilike("email", email)
        .limit(1);
      console.log("[municipal-admins] lookup", lookup);
      if (lookup.error) throw lookup.error;
      const existing = lookup.data?.[0];

      if (existing?.id) {
        const updateRes = await supabase
          .from("users")
          .update({
            role: "municipal_admin",
            municipality,
            firstName: form.firstName || null,
            lastName: form.lastName || null,
            disabledAt: null,
          })
          .eq("id", existing.id)
          .select();
        console.log("[municipal-admins] update", updateRes);
        if (updateRes.error) throw updateRes.error;
        toast({
          title: "Assigned",
          description: `${email} is now the ${municipality} admin.`,
        });
      } else {
        const id =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const insertRes = await supabase
          .from("users")
          .insert({
            id,
            email,
            firstName: form.firstName || null,
            lastName: form.lastName || null,
            role: "municipal_admin",
            municipality,
            createdAt: new Date().toISOString(),
          })
          .select();
        console.log("[municipal-admins] insert", insertRes);
        if (insertRes.error) throw insertRes.error;
        toast({
          title: "Municipal admin invited",
          description: `${email} can sign in and manage ${municipality}.`,
        });
      }
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        municipality: MINDORO_CITIES[0]?.displayName ?? "",
      });
      setCreating(false);
      setRefreshTick((t) => t + 1);
    } catch (err: any) {
      // PostgrestError fields are non-enumerable — extract via getOwnPropertyNames.
      const dump: Record<string, any> = {};
      try {
        for (const k of Object.getOwnPropertyNames(err ?? {})) dump[k] = (err as any)[k];
      } catch {}
      console.error("[municipal-admins] create failed:", {
        type: typeof err,
        name: err?.name,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        status: err?.status,
        toString: err?.toString?.(),
        dump,
      });
      toast({
        title: "Failed",
        description:
          err?.message ??
          err?.details ??
          err?.hint ??
          err?.error_description ??
          dump.message ??
          dump.details ??
          `Could not save admin${err?.code ? ` (code ${err.code})` : ""}.`,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign(adminId: string, municipality: string) {
    if (!municipality) return;
    const { error } = await supabase
      .from("users")
      .update({ municipality })
      .eq("id", adminId);
    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Municipality updated" });
    setRefreshTick((t) => t + 1);
  }

  async function handleToggleDisabled(admin: MunicipalAdmin) {
    const disabling = !admin.disabledAt;
    const { error } = await supabase
      .from("users")
      .update({ disabledAt: disabling ? new Date().toISOString() : null })
      .eq("id", admin.id);
    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: disabling ? "Admin disabled" : "Admin re-enabled",
    });
    setRefreshTick((t) => t + 1);
  }

  async function handleRevoke(admin: MunicipalAdmin) {
    if (!confirm(`Revoke municipal admin from ${admin.email}?`)) return;
    const { error } = await supabase
      .from("users")
      .update({ role: "user", municipality: null, disabledAt: null })
      .eq("id", admin.id);
    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Admin revoked" });
    setRefreshTick((t) => t + 1);
  }

  return (
    <AdminLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">
              Municipal Admins
            </h1>
            <p className="text-sm text-[#888]">
              Assign per-municipality moderators. Each admin can only manage
              sellers within their assigned municipality.
            </p>
          </div>
          <button
            className="flex items-center gap-2 h-9 px-5 rounded-xl text-white text-sm font-semibold"
            style={{ background: "#29a366" }}
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" /> Add Admin
          </button>
        </div>

        <div className="bg-white rounded-xl border border-black/[0.06] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or municipality…"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#f2f2f0] text-sm outline-none focus:ring-2 focus:ring-[#29a366]/30"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#888]">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-[#ccc]" />
              No municipal admins yet.
            </div>
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {filtered.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#f0faf5" }}
                  >
                    <ShieldCheck
                      className="h-4 w-4"
                      style={{ color: "#29a366" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#111] truncate">
                        {[admin.firstName, admin.lastName]
                          .filter(Boolean)
                          .join(" ") || admin.email}
                      </p>
                      {admin.disabledAt ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                          Disabled
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#29a366]/10 text-[#29a366]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#888] flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {admin.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <select
                          value={admin.municipality ?? ""}
                          onChange={(e) =>
                            handleReassign(admin.id, e.target.value)
                          }
                          className="bg-transparent outline-none cursor-pointer text-xs font-medium text-[#111]"
                        >
                          <option value="" disabled>
                            Assign municipality
                          </option>
                          {MINDORO_CITIES.map((c) => (
                            <option key={c.id} value={c.displayName}>
                              {c.displayName}
                            </option>
                          ))}
                        </select>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleDisabled(admin)}
                      className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] hover:bg-[#e8e8e6] flex items-center justify-center text-[#555]"
                      title={admin.disabledAt ? "Re-enable" : "Disable"}
                    >
                      {admin.disabledAt ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(admin)}
                      className="h-8 w-8 rounded-xl border border-red-200 bg-white hover:bg-red-50 flex items-center justify-center text-red-500"
                      title="Revoke admin role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#111]">
                  Add Municipal Admin
                </h2>
                <button
                  onClick={() => setCreating(false)}
                  className="p-1 text-[#888] hover:text-[#111]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs text-[#888]">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f2f0] text-sm outline-none focus:ring-2 focus:ring-[#29a366]/30"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#888]">First name</label>
                    <input
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#f2f2f0] text-sm outline-none focus:ring-2 focus:ring-[#29a366]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888]">Last name</label>
                    <input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#f2f2f0] text-sm outline-none focus:ring-2 focus:ring-[#29a366]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#888]">Municipality</label>
                  <select
                    required
                    value={form.municipality}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, municipality: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#f2f2f0] text-sm outline-none focus:ring-2 focus:ring-[#29a366]/30"
                  >
                    {MINDORO_CITIES.map((c) => (
                      <option key={c.id} value={c.displayName}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: "#29a366" }}
                >
                  {busy ? "Saving…" : "Save admin"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

"use client";

import { useMemo } from "react";
import { useCollection, useStableMemo } from "@/supabase";
import { useIsAdmin, normalizeMunicipality } from "@/hooks/use-is-admin";

/**
 * For municipal admins, returns the set of storeIds within their assigned
 * municipality. For general admins, returns `null` (meaning "no scope
 * restriction"). List pages use this to hide any records tied to sellers
 * outside their jurisdiction.
 */
export function useAdminStoreScope() {
  const { isAdmin, isMunicipalAdmin, municipality, isAdminLoading } =
    useIsAdmin();

  const storesConfig = useStableMemo(() => {
    if (!isAdmin) return null;
    // Only municipal admins actually need the store list here.
    if (!isMunicipalAdmin) return null;
    return { table: "stores", columns: "id, municipality, city" };
  }, [isAdmin, isMunicipalAdmin]);

  const { data: stores, isLoading } = useCollection(storesConfig);

  const inScopeIds = useMemo(() => {
    if (!isMunicipalAdmin) return null;
    const target = normalizeMunicipality(municipality);
    if (!target) return new Set<string>();
    const set = new Set<string>();
    for (const s of (stores ?? []) as any[]) {
      const sMuni = normalizeMunicipality(s.municipality);
      const sCity = normalizeMunicipality(s.city);
      if (sMuni === target || sCity === target) set.add(String(s.id));
    }
    return set;
  }, [stores, isMunicipalAdmin, municipality]);

  return {
    /** Set of allowed storeIds, or null when the admin has no scope restriction. */
    inScopeIds,
    /** true while the store list is loading (only meaningful for municipal admins). */
    isScopeLoading: (isMunicipalAdmin && isLoading) || isAdminLoading,
    /** true when the current admin is scoped to one municipality. */
    isScoped: isMunicipalAdmin,
    /** The scoped municipality (or null for super admins). */
    municipality,
  };
}

/** Returns true if the record's storeId/sellerId is inside the admin's scope. */
export function withinScope(
  inScopeIds: Set<string> | null,
  record: { storeId?: string | null; sellerId?: string | null } | null | undefined,
): boolean {
  if (!inScopeIds) return true; // no scope restriction
  if (!record) return false;
  const s = record.storeId ? String(record.storeId) : null;
  const seller = record.sellerId ? String(record.sellerId) : null;
  return (s !== null && inScopeIds.has(s)) || (seller !== null && inScopeIds.has(seller));
}

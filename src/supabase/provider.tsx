"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  DependencyList,
  type ReactNode,
} from "react";
import { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

/** App-level user type */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserHookResult {
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface SupabaseContextState {
  supabase: SupabaseClient;
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const SupabaseContext = createContext<SupabaseContextState | undefined>(
  undefined,
);

function mapUser(supaUser: SupabaseUser | null): AppUser | null {
  if (!supaUser) return null;
  return {
    uid: supaUser.id,
    email: supaUser.email ?? null,
    displayName:
      supaUser.user_metadata?.full_name ?? supaUser.user_metadata?.name ?? null,
    photoURL: supaUser.user_metadata?.avatar_url ?? null,
  };
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // If refresh token is invalid/expired, sign out to clear stale tokens
        if (
          error.message?.includes("Refresh Token") ||
          error.message?.includes("refresh_token")
        ) {
          console.warn(
            "Invalid refresh token detected, signing out to clear stale session.",
          );
          supabase.auth.signOut().then(() => {
            setUser(null);
            setIsUserLoading(false);
          });
          return;
        }
        setUserError(error);
      } else {
        setUser(mapUser(session?.user ?? null));
      }
      setIsUserLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION"
      ) {
        setUser(mapUser(session?.user ?? null));
        setIsUserLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const contextValue = useMemo(
    (): SupabaseContextState => ({
      supabase,
      user,
      isUserLoading,
      userError,
    }),
    [supabase, user, isUserLoading, userError],
  );

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
}

/** Returns the Supabase client instance */
export function useSupabase(): SupabaseClient {
  const context = useContext(SupabaseContext);
  if (!context)
    throw new Error("useSupabase must be used within SupabaseProvider");
  return context.supabase;
}

/** Returns { supabase, user, isUserLoading, userError } with auth signOut helper */
export function useSupabaseAuth(): {
  supabase: SupabaseClient;
  auth: { signOut: () => Promise<any> };
  user: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
} {
  const context = useContext(SupabaseContext);
  if (!context)
    throw new Error("useSupabaseAuth must be used within SupabaseProvider");
  return {
    supabase: context.supabase,
    auth: {
      signOut: () => context.supabase.auth.signOut(),
    },
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
}

/** Returns the Supabase auth interface */
export function useAuth() {
  const supabase = useSupabase();
  return supabase.auth;
}

/** Returns { user, isUserLoading, userError } */
export function useUser(): UserHookResult {
  const context = useContext(SupabaseContext);
  if (!context) throw new Error("useUser must be used within SupabaseProvider");
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
}

/** Stable memoize helper — wraps useMemo */
export function useStableMemo<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

'use client';

// Supabase module - Main entry point
// Re-exports everything for @/supabase imports

export { SupabaseProvider, useSupabase, useSupabaseAuth, useAuth, useUser, useStableMemo } from './provider';
export type { AppUser, UserHookResult, SupabaseContextState } from './provider';

export { useCollection } from './use-collection';
export type { SupabaseQueryConfig, WithId, UseCollectionResult } from './use-collection';

export { useDoc } from './use-doc';
export type { SupabaseDocConfig, UseDocResult } from './use-doc';

export { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from './non-blocking-updates';

export { initiateEmailSignUp, initiateEmailSignIn } from './auth';

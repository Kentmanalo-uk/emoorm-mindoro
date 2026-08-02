'use client';

import { SupabaseClient } from '@supabase/supabase-js';

/** Sign up with email/password. Returns user and whether email confirmation is needed. */
export async function initiateEmailSignUp(supabase: SupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  });
  if (error) throw error;
  return {
    user: data.user,
    needsConfirmation: !!(data.user && !data.session),
  };
}

/** Sign in with email/password. */
export async function initiateEmailSignIn(supabase: SupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user };
}

/** Google OAuth sign-in (redirect-based). */
export async function initiateGoogleSignIn(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
}

/**
 * Google OAuth sign-in in a centered popup window. Resolves when the popup
 * completes the exchange (auth state fires SIGNED_IN via multi-tab storage)
 * or rejects if the user closes the popup manually.
 */
export async function initiateGoogleSignInPopup(supabase: SupabaseClient): Promise<void> {
  if (typeof window === 'undefined') throw new Error('Popup sign-in requires a browser.');

  const redirectTo = `${window.location.origin}/auth/callback-popup`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start Google sign-in.');

  const w = 480, h = 620;
  const y = window.top?.outerHeight
    ? Math.max(0, (window.top.outerHeight - h) / 2 + (window.top.screenY || 0))
    : Math.max(0, (window.screen.height - h) / 2);
  const x = window.top?.outerWidth
    ? Math.max(0, (window.top.outerWidth - w) / 2 + (window.top.screenX || 0))
    : Math.max(0, (window.screen.width - w) / 2);

  const popup = window.open(
    data.url,
    'emoorm-google-signin',
    `popup=yes,width=${w},height=${h},left=${x},top=${y},noopener=no,noreferrer=no`,
  );
  if (!popup) throw new Error('Popup was blocked. Please allow popups and try again.');

  return new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => { if (done) return; done = true; cleanup(); fn(); };
    const onAuth = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') finish(() => { try { popup.close(); } catch {} resolve(); });
    });
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'emoorm-oauth-complete') finish(() => { try { popup.close(); } catch {} resolve(); });
      if (e.data?.type === 'emoorm-oauth-error') finish(() => { try { popup.close(); } catch {} reject(new Error(e.data.message || 'Sign-in failed.')); });
    };
    window.addEventListener('message', onMessage);
    const poll = window.setInterval(() => {
      if (popup.closed) finish(() => reject(new Error('Sign-in cancelled.')));
    }, 500);
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
      onAuth.data.subscription.unsubscribe();
    };
  });
}

/** Send OTP to a phone number (works for both sign-in and sign-up). */
export async function initiatePhoneOtp(supabase: SupabaseClient, phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/** Verify the SMS OTP code. */
export async function verifyPhoneOtp(supabase: SupabaseClient, phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  return { user: data.user };
}

"use client";

import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9f9f9]">
      <div className="bg-white rounded-[25px] p-8 md:p-12 w-full max-w-[480px] shadow-sm border-none text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-headline tracking-[-0.05em] mb-2">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          We sent a confirmation link to your email address.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          Click the link in the email to verify your account, then come back to
          sign in.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary font-bold hover:underline"
        >
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}

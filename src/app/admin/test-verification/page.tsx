"use client";

import React, { useEffect, useState } from "react";
import { useSupabase } from "@/supabase";
import { useUser } from "@/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TestVerificationPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [tests, setTests] = useState<
    { name: string; status: string; details: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: { name: string; status: string; details: string }[] = [];

    // Test 0: Check authentication status
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        results.push({
          name: "✓ Authenticated",
          status: "PASSED",
          details: `Logged in as ${session.user?.email || session.user?.id}`,
        });
      } else {
        results.push({
          name: "✗ Not Authenticated",
          status: "FAILED",
          details: "No active session - you must be logged in",
        });
      }
    } catch (e) {
      results.push({
        name: "✗ Auth Check",
        status: "ERROR",
        details: String(e),
      });
    }

    // Test 1: Check if verified column exists
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("verified, verified_at, id")
        .limit(1);

      if (error) {
        results.push({
          name: "✗ Verified Column Check",
          status: "FAILED",
          details: `Error: ${error.message}`,
        });
      } else if (data && data.length > 0) {
        results.push({
          name: "✓ Verified Column Exists",
          status: "PASSED",
          details: `verified=${data[0].verified}, verified_at=${data[0].verified_at}`,
        });
      } else {
        results.push({
          name: "✗ No Stores in Database",
          status: "FAILED",
          details: "Cannot test - no stores exist yet",
        });
      }
    } catch (e) {
      results.push({
        name: "✗ Verified Column Check",
        status: "ERROR",
        details: String(e),
      });
    }

    // Test 2: Try to update a store and check rows affected
    try {
      const { data: stores, error: fetchError } = await supabase
        .from("stores")
        .select("id, verified")
        .limit(1);

      if (fetchError || !stores || stores.length === 0) {
        results.push({
          name: "⊘ Skipping Update Test",
          status: "SKIPPED",
          details: "No stores found to test with",
        });
      } else {
        const storeId = stores[0].id;
        const currentStatus = stores[0].verified;
        const newStatus = !currentStatus;

        console.log(
          "[TEST] Attempting update on store:",
          storeId,
          "verified:",
          currentStatus,
          "→",
          newStatus,
        );

        // Try to update with .select() to see returned data
        const {
          data: updateData,
          error: updateError,
          count,
        } = await supabase
          .from("stores")
          .update({
            verified: newStatus,
            verified_at: newStatus ? new Date().toISOString() : null,
          })
          .eq("id", storeId)
          .select();

        console.log("[TEST] Update response:", {
          data: updateData,
          error: updateError,
          count,
        });

        if (updateError) {
          results.push({
            name: "✗ Update Failed (DB Error)",
            status: "FAILED",
            details: `${updateError.message} - Please check browser console`,
          });
        } else if (!updateData || updateData.length === 0) {
          results.push({
            name: "✗ Update Failed (No Rows Affected)",
            status: "FAILED",
            details: `Update returned 0 rows. Possible RLS policy issue.`,
          });
        } else {
          results.push({
            name: "✓ Update Succeeded",
            status: "PASSED",
            details: `Updated store - verified is now ${updateData[0].verified}`,
          });

          // Verify the change persisted
          const { data: checkData, error: checkError } = await supabase
            .from("stores")
            .select("verified")
            .eq("id", storeId)
            .single();

          if (checkError) {
            results.push({
              name: "✗ Verification Check Failed",
              status: "FAILED",
              details: checkError.message,
            });
          } else if (checkData?.verified === newStatus) {
            results.push({
              name: "✓ Data Persisted Successfully",
              status: "PASSED",
              details: `Verified ${newStatus} was saved and retrieved`,
            });
          } else {
            results.push({
              name: "✗ Data Did Not Persist",
              status: "FAILED",
              details: `Update returned ${newStatus} but query shows ${checkData?.verified}`,
            });
          }

          // Revert the change
          await supabase
            .from("stores")
            .update({ verified: currentStatus })
            .eq("id", storeId);
        }
      }
    } catch (e) {
      results.push({
        name: "✗ Update Test Exception",
        status: "ERROR",
        details: String(e),
      });
    }

    // Test 3: Check RLS status
    try {
      const { data, error }: any = await supabase.rpc("get_rls_status", {
        table_name: "stores",
      });

      if (error) {
        results.push({
          name: "⊘ RLS Status Check",
          status: "SKIPPED",
          details:
            "Could not check RLS (function may not exist) - check Supabase dashboard under Authentication > Policies",
        });
      } else {
        results.push({
          name: "ℹ RLS Status",
          status: "INFO",
          details: JSON.stringify(data),
        });
      }
    } catch (e: any) {
      results.push({
        name: "⊘ RLS Status",
        status: "SKIPPED",
        details: "Could not check RLS policies",
      });
    }

    setTests(results);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 pt-32">
      <h1 className="text-3xl font-bold mb-2">
        🔍 Verification System Diagnostic
      </h1>
      <p className="text-muted-foreground mb-8">
        Run comprehensive tests to identify why verification isn't persisting
      </p>

      <Button
        onClick={runTests}
        disabled={loading}
        className="mb-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg"
      >
        {loading ? "Running Tests..." : "Run All Tests"}
      </Button>

      <div className="space-y-4">
        {tests.map((test, i) => (
          <Card
            key={i}
            className="border-l-4"
            style={{
              borderLeftColor:
                test.status === "PASSED"
                  ? "#22c55e"
                  : test.status === "FAILED"
                    ? "#ef4444"
                    : test.status === "ERROR"
                      ? "#f59e0b"
                      : test.status === "SKIPPED"
                        ? "#8b5cf6"
                        : "#0ea5e9",
            }}
          >
            <CardContent className="p-6">
              <h3 className="font-bold mb-2">{test.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">
                {test.details}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length > 0 && (
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200">
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 text-lg">📋 Diagnosis & Solutions</h3>

            {tests.some((t) => t.name.includes("Not Authenticated")) && (
              <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-bold text-red-900">
                  ❌ Issue: Not logged in
                </p>
                <p className="text-sm text-red-800 mt-2">
                  You must be authenticated to update stores. Please log in
                  first.
                </p>
              </div>
            )}

            {tests.some(
              (t) => t.name.includes("Column") && t.status === "FAILED",
            ) && (
              <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-bold text-red-900">
                  ❌ Issue: Verified column missing
                </p>
                <p className="text-sm text-red-800 mt-2">
                  Run this SQL in Supabase Dashboard → SQL Editor:
                </p>
                <pre className="bg-white p-3 rounded font-mono text-xs overflow-auto mt-2 border border-red-200">
                  {`ALTER TABLE stores
ADD COLUMN verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN verified_by_admin_id TEXT DEFAULT NULL,
ADD COLUMN verification_notes TEXT DEFAULT NULL;

CREATE INDEX idx_stores_verified ON stores(verified);`}
                </pre>
              </div>
            )}

            {tests.some((t) => t.name.includes("No Rows Affected")) && (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-bold text-orange-900">
                  ⚠️ Issue: RLS Policy Blocking Updates
                </p>
                <p className="text-sm text-orange-800 mt-2">
                  The stores table may have RLS enabled without proper policies.
                  Run this in Supabase:
                </p>
                <pre className="bg-white p-3 rounded font-mono text-xs overflow-auto mt-2 border border-orange-200">
                  {`-- Enable RLS and add admin policy
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access on stores" ON stores;
CREATE POLICY "Admins full access on stores"
ON stores FOR ALL
TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Also allow public read
DROP POLICY IF EXISTS "Anyone can view stores" ON stores;
CREATE POLICY "Anyone can view stores"
ON stores FOR SELECT
TO public
USING (true);`}
                </pre>
              </div>
            )}

            {tests.some(
              (t) => t.status === "PASSED" && t.name.includes("Data Persisted"),
            ) && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-bold text-green-900">
                  ✓ Status: System is working correctly!
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Verification updates are persisting properly. If you're still
                  seeing issues in the admin panel, check the browser console
                  for logs.
                </p>
              </div>
            )}

            {tests.every((t) => t.status !== "PASSED") && tests.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold text-blue-900">💡 Next Steps:</p>
                <ol className="text-sm text-blue-800 mt-2 space-y-2 list-decimal list-inside">
                  <li>
                    Open browser DevTools (F12) and check the Console tab for
                    error messages
                  </li>
                  <li>
                    Look for any messages with "[VERIFY]" prefix in the logs
                  </li>
                  <li>
                    Verify your SUPABASE_URL and SUPABASE_ANON_KEY in .env.local
                  </li>
                  <li>
                    Check the Supabase Dashboard to ensure the verified column
                    exists
                  </li>
                  <li>
                    Verify RLS policies are correctly configured on the stores
                    table
                  </li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

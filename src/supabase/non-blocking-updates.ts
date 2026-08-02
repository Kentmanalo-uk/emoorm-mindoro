'use client';

import { SupabaseClient } from '@supabase/supabase-js';

function logDbError(op: string, table: string, err: any) {
  console.error(`[Supabase] ${op} error on ${table}:`, {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
  });
}

/**
 * Upsert a document (insert or update).
 * @param supabase Supabase client
 * @param table Table name
 * @param data Row data (must include 'id' for upsert)
 */
export function setDocumentNonBlocking(supabase: SupabaseClient, table: string, data: any) {
  supabase
    .from(table)
    .upsert(data, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) logDbError('Upsert', table, error);
    });
}

/**
 * Insert a new row.
 * @param supabase Supabase client
 * @param table Table name
 * @param data Row data
 * @returns Promise resolving to the inserted row (or undefined on error)
 */
export function addDocumentNonBlocking(supabase: SupabaseClient, table: string, data: any) {
  return supabase
    .from(table)
    .insert(data)
    .select()
    .then(({ data: rows, error }) => {
      if (error) {
        logDbError('Insert', table, error);
        return undefined;
      }
      return rows?.[0];
    });
}

/**
 * Update an existing row.
 * @param supabase Supabase client
 * @param table Table name
 * @param id Row ID
 * @param data Partial row data to update
 */
export function updateDocumentNonBlocking(supabase: SupabaseClient, table: string, id: string, data: any) {
  supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .then(({ error }) => {
      if (error) logDbError('Update', table, error);
    });
}

/**
 * Delete a row.
 * @param supabase Supabase client
 * @param table Table name
 * @param id Row ID
 */
export function deleteDocumentNonBlocking(supabase: SupabaseClient, table: string, id: string) {
  supabase
    .from(table)
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) logDbError('Delete', table, error);
    });
}

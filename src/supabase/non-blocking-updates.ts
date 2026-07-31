'use client';

import { SupabaseClient } from '@supabase/supabase-js';

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
      if (error) console.error(`[Supabase] Upsert error on ${table}:`, error.message);
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
        console.error(`[Supabase] Insert error on ${table}:`, error.message);
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
      if (error) console.error(`[Supabase] Update error on ${table}:`, error.message);
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
      if (error) console.error(`[Supabase] Delete error on ${table}:`, error.message);
    });
}

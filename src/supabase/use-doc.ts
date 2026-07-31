'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from './provider';

export interface SupabaseDocConfig {
  table: string;
  id: string;
}

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook to subscribe to a single Supabase row with real-time updates.
 * Pass a SupabaseDocConfig object (or null/undefined to skip).
 * Memoize the config with useMemo/useStableMemo for stability.
 */
export function useDoc<T = any>(
  config: SupabaseDocConfig | null | undefined
): UseDocResult<T> {
  const supabase = useSupabase();
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const configKey = config ? `${config.table}:${config.id}` : null;

  useEffect(() => {
    if (!config || !configKey) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const { data: row, error: fetchError } = await supabase
          .from(config.table)
          .select('*')
          .eq('id', config.id)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          setError(new Error(fetchError.message));
          setData(null);
        } else if (!row) {
          setData(null);
          setError(null);
        } else {
          setData(row as WithId<T>);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time changes for this specific row
    const channelName = `doc-${config.table}-${config.id}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.table, filter: `id=eq.${config.id}` },
        () => {
          if (!cancelled) fetchData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey, supabase]);

  return { data, isLoading, error };
}

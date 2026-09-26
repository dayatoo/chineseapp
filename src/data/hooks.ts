import { useSQLiteContext } from 'expo-sqlite';
import { type DependencyList, useEffect, useState } from 'react';

export const useDb = useSQLiteContext;

export type AsyncState<T> = { data: T | undefined; error: Error | undefined; loading: boolean };

/** Runs an async function whenever deps change; ignores results from stale runs. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fn().then(
      (data) => !cancelled && setState({ data, error: undefined, loading: false }),
      (error: Error) => !cancelled && setState({ data: undefined, error, loading: false }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

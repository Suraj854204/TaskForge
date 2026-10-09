import { DependencyList, useCallback, useEffect, useState } from 'react';
import { errMsg } from '../services/api';

/** Runs an async loader and tracks loading/error state. `refresh` reloads without showing the skeleton. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    setError(null);
    try { setData(await fn()); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, deps);

  useEffect(() => { run(false); }, [run]);
  return { data, setData, loading, error, reload: () => run(false), refresh: () => run(true) };
}

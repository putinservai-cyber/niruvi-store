import { useEffect, useState, useRef } from 'react';

/**
 * useBackgroundWorker
 * Custom React hook that periodically updates the server applications state
 * every 300 seconds (5 minutes) in the background to ensure catalog freshness,
 * returning the exact timestamp of the last successful synchronization.
 */
export function useBackgroundWorker(fetchCatalogApps: () => void) {
  const [lastFetched, setLastFetched] = useState<Date>(new Date());
  const fetchRef = useRef(fetchCatalogApps);

  useEffect(() => {
    fetchRef.current = fetchCatalogApps;
  }, [fetchCatalogApps]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRef.current();
      setLastFetched(new Date());
    }, 300 * 1000); // 300 seconds (5 minutes)

    return () => clearInterval(interval);
  }, []);

  const triggerManualRefresh = () => {
    fetchRef.current();
    setLastFetched(new Date());
  };

  return { lastFetched, triggerManualRefresh };
}

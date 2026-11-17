import { useEffect, useState } from 'react';

/**
 * Current time, re-rendering every `intervalMs` while `active`.
 * Keep it in small leaf components (clocks, timers) so a tick never
 * re-renders the whole workout screen.
 */
export function useNow(intervalMs = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

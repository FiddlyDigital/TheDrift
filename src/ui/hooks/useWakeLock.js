import { useEffect, useRef } from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// Hold a screen wake lock while playing so the display doesn't sleep mid-drift;
// re-acquire it when the tab becomes visible again.
export function useWakeLock() {
  const playing = useDriftStore((s) => s.playing);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      if (!("wakeLock" in navigator) || !playing) return;
      try {
        const wl = await navigator.wakeLock.request("screen");
        if (cancelled) { wl.release().catch(() => {}); return; }
        wakeLockRef.current = wl;
        wl.addEventListener("release", () => { if (wakeLockRef.current === wl) wakeLockRef.current = null; });
      } catch (e) {}
    };
    const onVis = () => { if (document.visibilityState === "visible" && playing && !wakeLockRef.current) acquire(); };
    if (playing) acquire();
    else if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); };
  }, [playing]);
}

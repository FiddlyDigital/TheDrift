import { useEffect, useRef } from 'react';
import { ENGINE } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';

// Immersive-view chrome: auto-hide the on-canvas UI after inactivity, leave on
// Escape, track fullscreen, and slip back into the mandala after a long idle
// while playing in the control view.
export function useImmersiveIdle() {
  const immersive = useDriftStore((s) => s.immersive);
  const playing = useDriftStore((s) => s.playing);
  const showWelcome = useDriftStore((s) => s.showWelcome);
  const hideTimerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // a layout pass when entering/leaving immersive so the canvas re-measures
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, [immersive]);

  // auto-hide the immersive UI; Escape leaves immersive
  useEffect(() => {
    const { setVizUiVisible, setImmersive } = useDriftStore.getState();
    if (!immersive) { setVizUiVisible(true); return; }
    setVizUiVisible(true);
    const arm = () => {
      setVizUiVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVizUiVisible(false), 3200);
    };
    const onKey = (e) => { if (e.key === "Escape") setImmersive(false); else arm(); };
    window.addEventListener("pointermove", arm);
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", arm);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", onKey);
      clearTimeout(hideTimerRef.current);
    };
  }, [immersive]);

  // track fullscreen state
  useEffect(() => {
    const onFs = () => useDriftStore.getState().setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // leaving immersive exits fullscreen
  useEffect(() => {
    if (!immersive && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [immersive]);

  // after a long idle while playing in the control view, return to the mandala
  useEffect(() => {
    if (!playing || immersive || showWelcome) return;
    const SS = 90000;
    const arm = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => { if (ENGINE.playing) useDriftStore.getState().setImmersive(true); }, SS);
    };
    arm();
    window.addEventListener("pointermove", arm);
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointermove", arm);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [playing, immersive, showWelcome]);
}

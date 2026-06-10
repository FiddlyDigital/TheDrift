import { useEffect } from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// Lifecycle owner for the five timer systems. Each effect arms a setInterval
// keyed on its trigger state and calls the matching store tick; the tick logic
// itself lives in the core slice.
export function useTimers() {
  const sleepEnd = useDriftStore((s) => s.sleepEnd);
  const wakeAt = useDriftStore((s) => s.wakeAt);
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const journey = useDriftStore((s) => s.journey);
  const driftOn = useDriftStore((s) => s.driftOn);
  const ganzfeld = useDriftStore((s) => s.ganzfeld);

  // sleep timer
  useEffect(() => {
    const tick = useDriftStore.getState().sleepTick;
    if (!sleepEnd) { tick(); return; }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sleepEnd]);

  // wake timer
  useEffect(() => {
    if (!wakeAt) return;
    const tick = useDriftStore.getState().wakeTick;
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [wakeAt]);

  // session timer
  useEffect(() => {
    const tick = useDriftStore.getState().sessionTick;
    if (!sessionEnd) { tick(); return; }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionEnd]);

  // guided journey
  useEffect(() => {
    if (!journey) return;
    const tick = useDriftStore.getState().journeyTick;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [journey]);

  // endless drift
  useEffect(() => {
    if (!driftOn) return;
    const tick = useDriftStore.getState().driftTick;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [driftOn]);

  // ganzfeld program
  useEffect(() => {
    if (!ganzfeld) return;
    const tick = useDriftStore.getState().ganzfeldTick;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ganzfeld]);
}

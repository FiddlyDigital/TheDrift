import { SCENES, DRIFT_POOL, DRIFT_SEG_MIN, DRIFT_SEG_MAX } from '../constants.js';

// ---- interpolation ----
export function easeInOut(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))); }
export function lerp(a, b, t) { return a + (b - a) * t; }

// ---- endless-drift segment helpers ----
export function driftSegMs() { return (DRIFT_SEG_MIN + Math.random() * (DRIFT_SEG_MAX - DRIFT_SEG_MIN)) * 1000; }
export function driftPick(i) {
  const L = DRIFT_POOL.length;
  const steps = [-2, -1, 1, 2];
  const s = steps[Math.floor(Math.random() * steps.length)];
  let j = i + s;
  if (j < 0 || j > L - 1) j = i - s;
  j = Math.max(0, Math.min(L - 1, j));
  if (j === i) j = (i === 0) ? 1 : i - 1;
  return j;
}

// ---- time-of-day helpers ----
export function sceneForHour(h) {
  if (h >= 5 && h < 9)   return "Stillness";
  if (h >= 9 && h < 14)  return "Clear Mind";
  if (h >= 14 && h < 18) return "Quickening";
  if (h >= 18 && h < 22) return "Reverie";
  if (h >= 22 || h < 1)  return "Tide";
  return "Deep Rest";
}
export function partOfDay(h) {
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}
export function welcomeWhisper(h) {
  if (h >= 5 && h < 9)   return "Dawn is opening — a soft theta hum to wake into.";
  if (h >= 9 && h < 14)  return "Morning light — clear, unhurried tone to think inside.";
  if (h >= 14 && h < 18) return "Afternoon — bright glasswork to carry the day along.";
  if (h >= 18 && h < 22) return "Evening — the full orchestra, slowly re-voicing as the light goes.";
  if (h >= 22 || h < 1)  return "Late now — gentle tides to drift down on.";
  return "The small hours — hushed felt piano for the deepest rest.";
}
export function defaultScene() {
  const name = sceneForHour(new Date().getHours());
  return SCENES.find((s) => s.name === name) || SCENES[0];
}

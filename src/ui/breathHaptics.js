// Pure helpers for breath-paced haptics, kept separate from the effect hook so
// the phase detection and the vibration mapping stay unit-testable.

// Which phase index of a breath pattern is active at time t (seconds).
export function breathPhaseIndexAt(pat, t) {
  if (!pat || !pat.seq || !pat.seq.length || !(pat.total > 0)) return 0;
  let pos = ((t % pat.total) + pat.total) % pat.total;   // handle negative t
  for (let k = 0; k < pat.seq.length; k++) {
    if (pos < pat.seq[k].d) return k;
    pos -= pat.seq[k].d;
  }
  return pat.seq.length - 1;
}

// A navigator.vibrate argument (ms, or a [buzz, gap, buzz] pattern) for the
// start of a breath phase, scaled by strength 0..1. The in-breath is the
// strongest cue, the out-breath softer, holds a faint tick.
export function vibrationPattern(label, strength) {
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  if (label === "Breathe in") {
    const d = Math.round(30 + s * 90);
    return s > 0.66 ? [d, 50, Math.round(d * 0.55)] : d;
  }
  if (label === "Breathe out") return Math.round(20 + s * 60);
  return Math.round(8 + s * 16); // Hold — faint tick
}

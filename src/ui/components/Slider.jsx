import React from 'react';

// ---- slider ----------------------------------------------------------
// built on a real <input type="range"> so it's fully keyboard-operable,
// screen-reader friendly, and has a generous touch target on mobile. The
// paper-ink look is layered on via CSS (track fill driven by --pct).
export function Slider({ min, max, step, value, onChange, name, valuetext }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className="rng"
      min={min} max={max} step={step} value={value}
      aria-label={name}
      aria-valuetext={valuetext}
      onChange={(e) => onChange(+e.target.value)}
      style={{ "--pct": pct + "%" }}
    />
  );
}

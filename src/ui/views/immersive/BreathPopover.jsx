import React, { useState, useRef, useEffect } from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { BREATH_ORDER, BREATH_PATTERNS, BREATH_RATE_MIN, BREATH_RATE_MAX } from '../../constants.js';
import { BreathIcon } from '../../icons.jsx';
import { Dial } from '../../components/Dial.jsx';

// The single home for the breath guide, opened from the dock. Picking a pattern
// turns the guide on (and re-picking the active one turns it off); the popover
// also holds the audible toggle and, for the paced "calm" pattern, the rate.
export function BreathPopover() {
  const breathOn = useDriftStore((s) => s.breathOn);
  const setBreathOn = useDriftStore((s) => s.setBreathOn);
  const breathPat = useDriftStore((s) => s.breathPat);
  const setBreathPat = useDriftStore((s) => s.setBreathPat);
  const breathRate = useDriftStore((s) => s.breathRate);
  const setBreathRate = useDriftStore((s) => s.setBreathRate);
  const breathAudible = useDriftStore((s) => s.breathAudible);
  const setBreathAudible = useDriftStore((s) => s.setBreathAudible);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const pick = (id) => {
    if (breathOn && breathPat === id) { setBreathOn(false); }
    else { setBreathPat(id); setBreathOn(true); }
  };

  return (
    <div className="breath-pop-wrap" ref={wrapRef}>
      <button className={"dock-item" + (breathOn ? " on" : "") + (open ? " active" : "")}
        onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Breath guide">
        <BreathIcon /><span>Breathe</span>
      </button>
      {open && (
        <div className="breath-pop" role="group" aria-label="Breath guide">
          <div className="breath-pop-title">Breathe</div>
          <div className="breath-pop-pats">
            {BREATH_ORDER.map((id) => (
              <button key={id}
                className={"breath-pop-chip" + (breathOn && breathPat === id ? " active" : "")}
                onClick={() => pick(id)}>
                {BREATH_PATTERNS[id].name}
              </button>
            ))}
          </div>
          {breathOn && (
            <>
              <button className={"breath-pop-toggle" + (breathAudible ? " on" : "")}
                onClick={() => setBreathAudible((v) => !v)}>
                {breathAudible ? "Breathing with sound" : "Silent guide"}
              </button>
              {breathPat === "calm" && (
                <div className="breath-pop-rate">
                  <Dial name="Rate" value={breathRate} label={breathRate.toFixed(1) + "/min"}
                    min={BREATH_RATE_MIN} max={BREATH_RATE_MAX} step={0.5} onChange={setBreathRate} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

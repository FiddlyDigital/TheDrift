import React, { useState, useRef, useEffect } from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { BREATH_ORDER, BREATH_PATTERNS, BREATH_RATE_MIN, BREATH_RATE_MAX } from '../../constants.js';
import { BreathIcon } from '../../icons.jsx';
import { Dial } from '../../components/Dial.jsx';
import { Slider } from '../../components/Slider.jsx';

// Whether this device can actually buzz. The Vibration API exists on desktop
// Chrome but is a no-op (no motor), and is absent on iOS — so we also require a
// touch device, where a vibration motor is a safe bet. Avoids showing a dead
// control on laptops.
const SUPPORTS_HAPTICS =
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function' &&
  ((navigator.maxTouchPoints || 0) > 0 ||
    (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches));

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
  const haptics = useDriftStore((s) => s.haptics);
  const setHaptics = useDriftStore((s) => s.setHaptics);
  const hapticStrength = useDriftStore((s) => s.hapticStrength);
  const setHapticStrength = useDriftStore((s) => s.setHapticStrength);
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
              {SUPPORTS_HAPTICS && (
                <>
                  <button className={"breath-pop-toggle" + (haptics ? " on" : "")}
                    onClick={() => {
                      const next = !haptics;
                      setHaptics(next);
                      // buzz inside the click (a real user gesture) so capable
                      // devices confirm support immediately; a no-op elsewhere
                      if (next) { try { navigator.vibrate([28, 45, 28]); } catch (e) {} }
                    }}>
                    {haptics ? "Haptic pacing on" : "Haptic pacing off"}
                  </button>
                  {haptics && (
                    <div className="breath-pop-strength">
                      <span className="breath-pop-strength-label">Strength</span>
                      <Slider name="Haptic strength" valuetext={Math.round(hapticStrength * 100) + "%"}
                        min={0.1} max={1} step={0.1} value={hapticStrength} onChange={setHapticStrength} />
                    </div>
                  )}
                </>
              )}
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

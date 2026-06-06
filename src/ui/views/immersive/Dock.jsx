import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SlidersIcon, BreathIcon, BellIcon, RouteIcon, InfoIcon } from '../../icons.jsx';
import { fmt } from '../../format.js';

// Bottom dock in the immersive view: clock, leave to Sound view, breath, and
// the Session / Journey / Info sheet toggles.
export function Dock() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const elapsed = useDriftStore((s) => s.elapsed);
  const setImmersive = useDriftStore((s) => s.setImmersive);
  const breathOn = useDriftStore((s) => s.breathOn);
  const setBreathOn = useDriftStore((s) => s.setBreathOn);
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const journey = useDriftStore((s) => s.journey);
  const driftOn = useDriftStore((s) => s.driftOn);
  const setSheet = useDriftStore((s) => s.setSheet);

  return (
    <div className={"dock" + (vizUiVisible ? " show" : "")}>
      <span className="dock-time">{fmt(elapsed)}</span>
      <span className="dock-sep" aria-hidden="true"></span>
      <button className="dock-item" onClick={() => setImmersive(false)}>
        <SlidersIcon /><span>Sound</span>
      </button>
      <button className={"dock-item" + (breathOn ? " on" : "")} onClick={() => setBreathOn((b) => !b)}>
        <BreathIcon /><span>Breathe</span>
      </button>
      <button className={"dock-item" + (sessionEnd > 0 ? " on" : "")}
        onClick={() => setSheet((s) => (s === "session" ? null : "session"))}>
        <BellIcon /><span>Session</span>
      </button>
      <button className={"dock-item" + ((journey || driftOn) ? " on" : "")}
        onClick={() => setSheet((s) => (s === "journey" ? null : "journey"))}>
        <RouteIcon /><span>Journey</span>
      </button>
      <span className="dock-sep" aria-hidden="true"></span>
      <button className="dock-icon" onClick={() => setSheet((s) => (s === "info" ? null : "info"))} aria-label="About The Drift">
        <InfoIcon />
      </button>
    </div>
  );
}

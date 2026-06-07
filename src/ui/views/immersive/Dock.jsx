import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SlidersIcon, BellIcon, RouteIcon, InfoIcon, RaindropIcon, HeadphonesIcon, SunriseIcon } from '../../icons.jsx';
import { BreathPopover } from './BreathPopover.jsx';
import { fmt } from '../../format.js';

// Bottom dock — the single "remote" for the immersive experience: the clock,
// the Sound console entry, the breath guide (popover), the live "feel" toggles
// (play-along / spatial / entrain), and the Session / Journey / Info sheets.
export function Dock() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const elapsed = useDriftStore((s) => s.elapsed);
  const setConsoleOpen = useDriftStore((s) => s.setConsoleOpen);
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const journey = useDriftStore((s) => s.journey);
  const driftOn = useDriftStore((s) => s.driftOn);
  const setSheet = useDriftStore((s) => s.setSheet);
  const vizMode = useDriftStore((s) => s.vizMode);
  const playAlong = useDriftStore((s) => s.playAlong);
  const togglePlayAlong = useDriftStore((s) => s.togglePlayAlong);
  const spatial = useDriftStore((s) => s.spatial);
  const toggleSpatial = useDriftStore((s) => s.toggleSpatial);
  const entrainViz = useDriftStore((s) => s.entrainViz);
  const toggleEntrainViz = useDriftStore((s) => s.toggleEntrainViz);
  const beatOn = useDriftStore((s) => s.params.binaural !== "off");

  return (
    <div className={"dock" + (vizUiVisible ? " show" : "")}>
      <span className="dock-time">{fmt(elapsed)}</span>
      <span className="dock-sep" aria-hidden="true"></span>

      <button className="dock-item" onClick={() => setConsoleOpen(true)}>
        <SlidersIcon /><span>Sound</span>
      </button>
      <BreathPopover />

      <span className="dock-sep" aria-hidden="true"></span>

      {/* live "feel" toggles */}
      {vizMode === "mandala" && (
        <button className={"dock-icon" + (playAlong ? " on" : "")} onClick={togglePlayAlong}
          aria-label={playAlong ? "Play along on" : "Play along off"}
          title={playAlong ? "Play along on — tap the mandala" : "Play along — tap to drop notes"}>
          <RaindropIcon />
        </button>
      )}
      <button className={"dock-icon" + (spatial ? " on" : "")} onClick={toggleSpatial}
        aria-label={spatial ? "Spatial audio on" : "Spatial audio off"}
        title={spatial ? "Spatial audio on (headphones)" : "Spatial audio off"}>
        <HeadphonesIcon />
      </button>
      {beatOn && (
        <button className={"dock-icon" + (entrainViz ? " on" : "")} onClick={toggleEntrainViz}
          aria-label={entrainViz ? "Entrain light on" : "Entrain light off"}
          title={entrainViz ? "Entrain light on — pulsing with the beat" : "Entrain light — pulse with the beat"}>
          <SunriseIcon />
        </button>
      )}

      <span className="dock-sep" aria-hidden="true"></span>

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

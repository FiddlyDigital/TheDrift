import React, { useState, useRef, useEffect } from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SlidersIcon, BellIcon, RouteIcon, InfoIcon, RaindropIcon, HeadphonesIcon, SunriseIcon, MoreIcon } from '../../icons.jsx';
import { BreathPopover } from './BreathPopover.jsx';
import { fmt } from '../../format.js';

// The secondary "feel" toggles + About, collapsed behind a More popover. Shown
// only on mobile (CSS), where the full set of inline controls won't fit.
function DockMore({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="breath-pop-wrap dock-more" ref={ref}>
      <button className={"dock-icon" + (open ? " active" : "")} onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-label="More controls">
        <MoreIcon />
      </button>
      {open && (
        <div className="breath-pop dock-more-pop" role="group" aria-label="More controls">
          <div className="breath-pop-title">Controls</div>
          {items.map((b) => (
            <button key={b.key} className={"dock-more-row" + (b.on ? " on" : "")}
              onClick={() => { b.onClick(); setOpen(false); }}>
              <span className="dock-more-ico">{b.icon}</span>
              <span>{b.label}</span>
              {b.toggle && <span className="dock-more-state">{b.on ? "On" : "Off"}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Bottom dock — the single "remote" for the immersive experience: the clock,
// the Sound console entry, the breath guide (popover), the live "feel" toggles
// (play-along / spatial / entrain) and About. On mobile the feel toggles + About
// collapse into a More popover so the dock stays narrow.
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

  // one description list, rendered inline (wide) and inside More (mobile)
  const secondary = [
    vizMode === "mandala" && { key: "playalong", toggle: true, on: playAlong, onClick: togglePlayAlong, icon: <RaindropIcon />,
      label: "Play along", title: playAlong ? "Play along on — tap the mandala" : "Play along — tap to drop notes" },
    { key: "spatial", toggle: true, on: spatial, onClick: toggleSpatial, icon: <HeadphonesIcon />,
      label: "Spatial audio", title: spatial ? "Spatial audio on (headphones)" : "Spatial audio off" },
    beatOn && { key: "entrain", toggle: true, on: entrainViz, onClick: toggleEntrainViz, icon: <SunriseIcon />,
      label: "Entrain light", title: entrainViz ? "Entrain light on — pulsing with the beat" : "Entrain light — pulse with the beat" },
    { key: "info", toggle: false, on: false, onClick: () => setSheet((s) => (s === "info" ? null : "info")), icon: <InfoIcon />,
      label: "About The Drift", title: "About The Drift" },
  ].filter(Boolean);

  return (
    <div className={"dock" + (vizUiVisible ? " show" : "")}>
      <span className="dock-time">{fmt(elapsed)}</span>
      <span className="dock-sep" aria-hidden="true"></span>

      <button className="dock-item" onClick={() => setConsoleOpen(true)}>
        <SlidersIcon /><span>Sound</span>
      </button>
      <BreathPopover />

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

      {/* inline feel toggles + About (wide screens) */}
      <div className="dock-feel">
        {secondary.map((b) => (
          <button key={b.key} className={"dock-icon" + (b.on ? " on" : "")} onClick={b.onClick}
            aria-label={b.label} title={b.title}>
            {b.icon}
          </button>
        ))}
      </div>

      {/* the same set, collapsed (mobile) */}
      <DockMore items={secondary} />
    </div>
  );
}

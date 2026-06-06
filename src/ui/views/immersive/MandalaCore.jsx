import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { PlayIcon, PauseIcon } from '../../icons.jsx';

// The central play/pause target at the heart of the immersive mandala.
export function MandalaCore() {
  const playing = useDriftStore((s) => s.playing);
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const breathOn = useDriftStore((s) => s.breathOn);
  const toggle = useDriftStore((s) => s.toggle);

  return (
    <button
      className={"mandala-core" + (playing ? " playing" : " paused") + (vizUiVisible ? " ui" : "") + (breathOn ? " breath" : "")}
      onClick={toggle}
      aria-label={playing ? "Pause" : "Play"}>
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

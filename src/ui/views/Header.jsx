import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { PlayIcon, PauseIcon, VizIcon } from '../icons.jsx';
import { fmt } from '../format.js';

// Title block + transport (clock, mandala return, play/pause). Triple-tapping
// the title unlocks the hidden Atelier section.
export function Header() {
  const playing = useDriftStore((s) => s.playing);
  const elapsed = useDriftStore((s) => s.elapsed);
  const expert = useDriftStore((s) => s.expert);
  const unlockExpert = useDriftStore((s) => s.unlockExpert);
  const setImmersive = useDriftStore((s) => s.setImmersive);
  const toggle = useDriftStore((s) => s.toggle);

  return (
    <header className="head">
      <div className="head-left">
        <div className="eyebrow">Generative Ambient System</div>
        <h1 className="title" onClick={unlockExpert} title={expert ? "Atelier unlocked" : undefined}>The Drift<em>.</em></h1>
        <p className="subtitle">
          Unequal loops, each a single held note, drifting endlessly in and
          out of phase &mdash; so the music never repeats.
        </p>
      </div>
      <div className="transport">
        <div className="clock">
          <div><b>{playing ? "playing" : "paused"}</b></div>
          <div>{fmt(elapsed)}</div>
        </div>
        <button className="mandala-btn" onClick={() => setImmersive(true)} aria-label="Back to the mandala" title="Back to the mandala">
          <VizIcon /> <span>Mandala</span>
        </button>
        <button className="play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </header>
  );
}

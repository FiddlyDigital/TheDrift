import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { PlayIcon } from '../icons.jsx';
import { partOfDay, welcomeWhisper } from '../store/util.js';

// First-visit splash, dismissed by "Begin the drift" (which starts playback and
// enters the immersive mandala).
export function WelcomeScreen() {
  const showWelcome = useDriftStore((s) => s.showWelcome);
  const welcomeHiding = useDriftStore((s) => s.welcomeHiding);
  const WELCOME = useDriftStore((s) => s.WELCOME);
  const begin = useDriftStore((s) => s.begin);
  if (!showWelcome) return null;

  return (
    <div className={"welcome" + (welcomeHiding ? " hide" : "")}>
      <div className="welcome-rings" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
        <span className="seed"></span>
        <span className="core"></span>
      </div>
      <div className="welcome-word">
        <div className="welcome-eyebrow">Generative Ambient System</div>
        <h1 className="welcome-title">The Drift<em>.</em></h1>
        <p className="welcome-sub">
          Unequal loops, each a single held note, drifting endlessly in and
          out of phase &mdash; so the music never repeats.
        </p>
        <p className="welcome-whisper">{welcomeWhisper(new Date().getHours())}</p>
      </div>
      <button className="welcome-begin" onClick={begin}>
        <PlayIcon /> Begin the drift
      </button>
      <div className="welcome-foot">
        {partOfDay(new Date().getHours()).toLowerCase()} &middot; tuned to <em>{WELCOME.name}</em> &middot; headphones recommended
      </div>
    </div>
  );
}

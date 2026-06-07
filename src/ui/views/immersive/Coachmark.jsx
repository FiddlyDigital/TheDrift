import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';

// One-time hint shown just above the dock after the first Begin, orienting
// newcomers to the immersive controls. Dismissed by tap or after a timeout.
export function Coachmark() {
  const visible = useDriftStore((s) => s.coachVisible);
  const dismiss = useDriftStore((s) => s.dismissCoach);
  if (!visible) return null;

  return (
    <div className="coach" role="status">
      <p className="coach-text">
        This is your space. <b>Breathe</b>, set a <b>timer</b>, or open the sound
        panel to <b>shape the music</b> — all from the controls below.
      </p>
      <button className="coach-dismiss" onClick={dismiss}>Got it</button>
    </div>
  );
}

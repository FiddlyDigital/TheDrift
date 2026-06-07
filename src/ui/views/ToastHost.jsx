import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// A single consolidated toast queue. Each transient confirmation flag in the
// store maps to one entry; whichever are active stack in the bottom-centre,
// above the dock. Lives at the app root so toasts show in every view (the old
// inline Footer toasts were hidden in the immersive mandala).
export function ToastHost() {
  const savedToast = useDriftStore((s) => s.savedToast);
  const copied = useDriftStore((s) => s.copied);
  const expertToast = useDriftStore((s) => s.expertToast);
  const spatialToast = useDriftStore((s) => s.spatialToast);
  const playAlongToast = useDriftStore((s) => s.playAlongToast);
  const entrainToast = useDriftStore((s) => s.entrainToast);

  const toasts = [
    savedToast && "Kept in your library",
    copied && "Link copied",
    expertToast && "Atelier unlocked — see the new tab",
    spatialToast && "Spatial audio on — best with headphones",
    playAlongToast && "Play along — tap height for pitch, hold for a glitch",
    entrainToast && "Entrain light on — gentle by design; skip it if flicker bothers you",
  ].filter(Boolean);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((msg) => (
        <div key={msg} className="toast-pill">{msg}</div>
      ))}
    </div>
  );
}

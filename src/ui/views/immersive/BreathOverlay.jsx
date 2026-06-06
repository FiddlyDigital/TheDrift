import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';

// DOM breath guide for the 3D view (the 2D mandala draws its own). The refs are
// owned by App and driven by the visualizer loop each frame.
export function BreathOverlay({ breathRingRef, breathLabelRef, breathCountRef }) {
  const breathOn = useDriftStore((s) => s.breathOn);
  const vizMode = useDriftStore((s) => s.vizMode);
  if (!breathOn || vizMode !== "space") return null;

  return (
    <div className="breath-overlay" aria-hidden="true">
      <div className="breath-ring" ref={breathRingRef}></div>
      <div className="breath-cue">
        <span className="breath-label" ref={breathLabelRef}></span>
        <span className="breath-count" ref={breathCountRef}></span>
      </div>
    </div>
  );
}

import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { VizCorner } from './VizCorner.jsx';
import { BreathOverlay } from './BreathOverlay.jsx';
import { CastCaption } from './CastCaption.jsx';
import { StatusIndicators } from './StatusIndicators.jsx';
import { MandalaCore } from './MandalaCore.jsx';
import { Dock } from './Dock.jsx';

// All immersive-view overlays, rendered only while immersive. The breath-overlay
// refs are owned by App (driven by the visualizer loop).
export function ImmersiveLayer({ breathRingRef, breathLabelRef, breathCountRef }) {
  const immersive = useDriftStore((s) => s.immersive);
  if (!immersive) return null;

  return (
    <>
      <VizCorner />
      <BreathOverlay breathRingRef={breathRingRef} breathLabelRef={breathLabelRef} breathCountRef={breathCountRef} />
      <CastCaption />
      <StatusIndicators />
      <MandalaCore />
      <Dock />
    </>
  );
}

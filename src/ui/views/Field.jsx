import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { moodName, ensembleName } from '../format.js';

// The canvases (2D mandala + WebGL 3D) and the field hint. The canvas refs are
// owned by App (shared with the visualizer hook) and passed in.
export function Field({ canvasRef, glCanvasRef }) {
  const vizMode = useDriftStore((s) => s.vizMode);
  const immersive = useDriftStore((s) => s.immersive);
  const playing = useDriftStore((s) => s.playing);
  const toggle = useDriftStore((s) => s.toggle);
  const params = useDriftStore((s) => s.params);

  return (
    <div className="field-wrap">
      <canvas className="field" ref={canvasRef}></canvas>
      <canvas className={"field field-gl" + (vizMode === "space" && immersive ? " show" : "")} ref={glCanvasRef}></canvas>
      <div className="field-hint">{ensembleName(params)} &middot; {moodName(params)} &middot; {params.density} loops</div>
      {!playing && (
        <div className="idle-veil" onClick={toggle}>
          <span>press play to begin the drift</span>
        </div>
      )}
    </div>
  );
}

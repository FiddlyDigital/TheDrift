import React, { useRef, useState } from 'react';
import { useScopes } from '../../../hooks/useScopes.js';

// Atelier lab scopes: a Voice Spectrogram (frequency × time) and a stereo
// Vectorscope (L × R, 45°). Hidden by default behind a Show/Hide toggle — while
// hidden the canvases are unmounted, so useScopes no-ops and no rAF loop runs.
export function Scopes() {
  const specRef = useRef(null);
  const vecRef = useRef(null);
  const [open, setOpen] = useState(false);
  // `enabled` re-runs the effect when the canvases mount/unmount — ref identity
  // is stable, so the effect can't key off the refs alone.
  useScopes({ specCanvasRef: specRef, vectorCanvasRef: vecRef, enabled: open });

  return (
    <div className="atelier-group scopes-group">
      <div className="loom-head">
        <span className="row-label">Oscilloscopes</span>
        <button className="chip mini" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <div className="scopes-wrap">
          <figure className="scope-cell">
            <canvas ref={specRef} className="scope-canvas spectrogram" />
            <figcaption className="scope-label">Spectrogram · frequency × time</figcaption>
          </figure>
          <figure className="scope-cell">
            <canvas ref={vecRef} className="scope-canvas vectorscope" />
            <figcaption className="scope-label">Vectorscope · L × R (45°)</figcaption>
          </figure>
        </div>
      )}
      <p className="atelier-hint">Live taps off the master output &mdash; silent until playback begins.</p>
    </div>
  );
}

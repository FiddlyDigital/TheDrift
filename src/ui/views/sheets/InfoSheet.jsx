import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { DownloadIcon, SlidersIcon } from '../../icons.jsx';
import { moodName, ensembleName } from '../../format.js';

// "About" sheet with quick actions (export, open sound view, share, fullscreen,
// install).
export function InfoSheet() {
  const params = useDriftStore((s) => s.params);
  const activeScene = useDriftStore((s) => s.activeScene);
  const copied = useDriftStore((s) => s.copied);
  const isFullscreen = useDriftStore((s) => s.isFullscreen);
  const installPrompt = useDriftStore((s) => s.installPrompt);
  const setSheet = useDriftStore((s) => s.setSheet);
  const setConsoleOpen = useDriftStore((s) => s.setConsoleOpen);
  const share = useDriftStore((s) => s.share);
  const install = useDriftStore((s) => s.install);
  const toggleFullscreen = useDriftStore((s) => s.toggleFullscreen);

  return (
    <div className="sheet-body">
      <div className="info-eyebrow">Generative Ambient System</div>
      <h2 className="info-title">The Drift<em>.</em></h2>
      <p className="info-sub">
        Unequal loops, each a single held note, drifting endlessly in and out of phase
        &mdash; so the music never repeats.
      </p>
      <p className="info-now">Now playing &middot; {ensembleName(params)} &middot; {moodName(params)}{activeScene ? " · " + activeScene : ""}</p>
      <div className="info-actions">
        <button className="ghost-btn accent" onClick={() => setSheet("export")}><DownloadIcon /> Export this drift</button>
        <button className="ghost-btn" onClick={() => { setSheet(null); setConsoleOpen(true); }}><SlidersIcon /> Open Sound &amp; tuning</button>
        <button className="ghost-btn" onClick={() => setSheet("help")}>Keys &amp; shortcuts</button>
        <button className="ghost-btn" onClick={share}>{copied ? "Link copied" : "Copy share link"}</button>
        <button className="ghost-btn" onClick={toggleFullscreen}>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
        {installPrompt && <button className="ghost-btn" onClick={install}>Install app</button>}
      </div>
      <div className="info-foot">headphones recommended &middot; tuned to <em>{activeScene || moodName(params)}</em></div>
    </div>
  );
}

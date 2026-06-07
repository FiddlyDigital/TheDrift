import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { BREATH_ORDER, BREATH_PATTERNS } from '../../constants.js';
import { VizIcon, CubeIcon, HeadphonesIcon, RaindropIcon, FullscreenIcon, FullscreenExitIcon } from '../../icons.jsx';

// Top-corner chips in the immersive view: breath patterns, mandala/3D toggle,
// spatial-audio and fullscreen.
export function VizCorner() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const breathOn = useDriftStore((s) => s.breathOn);
  const breathPat = useDriftStore((s) => s.breathPat);
  const setBreathPat = useDriftStore((s) => s.setBreathPat);
  const vizMode = useDriftStore((s) => s.vizMode);
  const setVizMode = useDriftStore((s) => s.setVizMode);
  const spatial = useDriftStore((s) => s.spatial);
  const toggleSpatial = useDriftStore((s) => s.toggleSpatial);
  const playAlong = useDriftStore((s) => s.playAlong);
  const togglePlayAlong = useDriftStore((s) => s.togglePlayAlong);
  const isFullscreen = useDriftStore((s) => s.isFullscreen);
  const toggleFullscreen = useDriftStore((s) => s.toggleFullscreen);

  return (
    <div className={"viz-corner" + (vizUiVisible ? " show" : "")}>
      {breathOn && (
        <div className="breath-pats">
          {BREATH_ORDER.map((id) => (
            <button key={id}
              className={"viz-chip mini" + (breathPat === id ? " active" : "")}
              onClick={() => setBreathPat(id)}>
              {BREATH_PATTERNS[id].name}
            </button>
          ))}
        </div>
      )}
      {vizMode === "mandala" && (
        <button className={"viz-chip mini" + (playAlong ? " active" : "")}
          onClick={togglePlayAlong}
          aria-label={playAlong ? "Play along on" : "Play along off"}
          title={playAlong ? "Play along on — tap the mandala" : "Play along — tap to drop notes"}>
          <RaindropIcon />
        </button>
      )}
      <button className={"viz-chip mini" + (vizMode === "space" ? " active" : "")}
        onClick={() => setVizMode((m) => (m === "space" ? "mandala" : "space"))}
        aria-label={vizMode === "space" ? "Switch to mandala" : "Switch to 3D space"}
        title={vizMode === "space" ? "Mandala view" : "3D space view"}>
        {vizMode === "space" ? <VizIcon /> : <CubeIcon />}
      </button>
      <button className={"viz-chip mini" + (spatial ? " active" : "")}
        onClick={toggleSpatial}
        aria-label={spatial ? "Spatial audio on" : "Spatial audio off"}
        title={spatial ? "Spatial audio on (headphones)" : "Spatial audio off"}>
        <HeadphonesIcon />
      </button>
      <button className="viz-chip mini" onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Windowed" : "Fullscreen"}>
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </button>
    </div>
  );
}

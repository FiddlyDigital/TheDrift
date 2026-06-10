import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { VizIcon, CubeIcon, FullscreenIcon, FullscreenExitIcon } from '../../icons.jsx';

// Top-corner display controls in the immersive view: the 2D mandala / 3D space
// toggle and fullscreen. Everything experiential (breath, play-along, spatial)
// lives in the dock; this corner is just how you *look* at the field.
export function VizCorner() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const vizMode = useDriftStore((s) => s.vizMode);
  const setVizMode = useDriftStore((s) => s.setVizMode);
  const isFullscreen = useDriftStore((s) => s.isFullscreen);
  const toggleFullscreen = useDriftStore((s) => s.toggleFullscreen);

  return (
    <div className={"viz-corner" + (vizUiVisible ? " show" : "")}>
      {/* the mandala/space toggle is meaningless over the featureless ganzfeld
          field — end the session from its sheet to return */}
      {vizMode !== "ganzfeld" && (
        <button className={"viz-chip mini" + (vizMode === "space" ? " active" : "")}
          onClick={() => setVizMode((m) => (m === "space" ? "mandala" : "space"))}
          aria-label={vizMode === "space" ? "Switch to mandala" : "Switch to 3D space"}
          title={vizMode === "space" ? "Mandala view" : "3D space view"}>
          {vizMode === "space" ? <VizIcon /> : <CubeIcon />}
        </button>
      )}
      <button className="viz-chip mini" onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Windowed" : "Fullscreen"}>
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </button>
    </div>
  );
}

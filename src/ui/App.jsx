import React, { useRef } from 'react';
import { useDriftStore } from './store/useDriftStore.js';
import { useVisualizer } from './hooks/useVisualizer.js';
import { usePlayAlong } from './hooks/usePlayAlong.js';
import { useTimers } from './hooks/useTimers.js';
import { useMidiBridge } from './hooks/useMidiBridge.js';
import { useMediaSession } from './hooks/useMediaSession.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { useImmersiveIdle } from './hooks/useImmersiveIdle.js';
import { usePersistence } from './hooks/usePersistence.js';
import { Header } from './views/Header.jsx';
import { Field } from './views/Field.jsx';
import { Legend } from './views/Legend.jsx';
import { Footer } from './views/Footer.jsx';
import { WelcomeScreen } from './views/WelcomeScreen.jsx';
import { ControlsPanel } from './views/controls/ControlsPanel.jsx';
import { ImmersiveLayer } from './views/immersive/ImmersiveLayer.jsx';
import { Sheets } from './views/sheets/Sheets.jsx';

// ---- main ------------------------------------------------------------
// App is a thin shell: it owns the DOM refs for the canvases / breath overlay,
// wires up the effect hooks, and composes the view. All state + behaviour lives
// in the Zustand store slices and the hooks; each view selects what it needs.
export default function App() {
  const immersive = useDriftStore((s) => s.immersive);
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const playAlong = useDriftStore((s) => s.playAlong);
  const vizMode = useDriftStore((s) => s.vizMode);

  // DOM refs owned by the view; the canvases + 3D breath overlay are driven by
  // the visualizer loop, so they're created here and passed where needed.
  const canvasRef = useRef(null);
  const glCanvasRef = useRef(null);
  const breathRingRef = useRef(null);
  const breathLabelRef = useRef(null);
  const breathCountRef = useRef(null);

  // effect hooks (each reads/drives the store)
  usePersistence();
  const { emitRipple } = useVisualizer({ canvasRef, glCanvasRef, breathRingRef, breathLabelRef, breathCountRef });
  usePlayAlong({ canvasRef, emitRipple });
  useTimers();
  useMidiBridge();
  useMediaSession();
  useWakeLock();
  useInstallPrompt();
  useImmersiveIdle();

  return (
    <div className={"stage" + (immersive ? " immersive" : "") + (immersive && !vizUiVisible ? " hide-cursor" : "") + (playAlong && immersive && vizMode === "mandala" ? " play-along" : "")}>
      <Header />
      <Field canvasRef={canvasRef} glCanvasRef={glCanvasRef} />
      <Legend />
      <ControlsPanel />
      <Footer />
      <ImmersiveLayer breathRingRef={breathRingRef} breathLabelRef={breathLabelRef} breathCountRef={breathCountRef} />
      <Sheets />
      <WelcomeScreen />
    </div>
  );
}

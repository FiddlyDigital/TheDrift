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
import { useBreathHaptics } from './hooks/useBreathHaptics.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { Field } from './views/Field.jsx';
import { WelcomeScreen } from './views/WelcomeScreen.jsx';
import { SoundConsole } from './views/SoundConsole.jsx';
import { ToastHost } from './views/ToastHost.jsx';
import { EntrainConsent } from './views/EntrainConsent.jsx';
import { GanzfeldConsent } from './views/GanzfeldConsent.jsx';
import { Coachmark } from './views/immersive/Coachmark.jsx';
import { ImmersiveLayer } from './views/immersive/ImmersiveLayer.jsx';
import { Sheets } from './views/sheets/Sheets.jsx';

// ---- main ------------------------------------------------------------
// App is a thin shell: it owns the DOM refs for the canvases / breath overlay,
// wires up the effect hooks, and composes the view. The design is immersive-
// first — the mandala Field is the permanent base layer and the immersive HUD
// is always present; the Sound & tuning console slides in over it as a drawer.
// All state + behaviour lives in the Zustand store slices and the hooks.
export default function App() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const playAlong = useDriftStore((s) => s.playAlong);
  const vizMode = useDriftStore((s) => s.vizMode);
  const consoleOpen = useDriftStore((s) => s.consoleOpen);

  // DOM refs owned by the view; the canvases + 3D breath overlay are driven by
  // the visualizer loop, so they're created here and passed where needed.
  const canvasRef = useRef(null);
  const glCanvasRef = useRef(null);
  const ganzfeldCanvasRef = useRef(null);
  const breathRingRef = useRef(null);
  const breathLabelRef = useRef(null);
  const breathCountRef = useRef(null);

  // effect hooks (each reads/drives the store)
  usePersistence();
  const { emitRipple } = useVisualizer({ canvasRef, glCanvasRef, ganzfeldCanvasRef, breathRingRef, breathLabelRef, breathCountRef });
  usePlayAlong({ canvasRef, emitRipple });
  useTimers();
  useMidiBridge();
  useMediaSession();
  useWakeLock();
  useInstallPrompt();
  useImmersiveIdle();
  useBreathHaptics();
  useKeyboardShortcuts();

  return (
    <div className={"stage immersive"
      + (!vizUiVisible && !consoleOpen ? " hide-cursor" : "")
      + (consoleOpen ? " console-open" : "")
      + (playAlong && !consoleOpen && vizMode === "mandala" ? " play-along" : "")}>
      <Field canvasRef={canvasRef} glCanvasRef={glCanvasRef} ganzfeldCanvasRef={ganzfeldCanvasRef} />
      <ImmersiveLayer breathRingRef={breathRingRef} breathLabelRef={breathLabelRef} breathCountRef={breathCountRef} />
      <SoundConsole />
      <Coachmark />
      <Sheets />
      <EntrainConsent />
      <GanzfeldConsent />
      <ToastHost />
      <WelcomeScreen />
    </div>
  );
}

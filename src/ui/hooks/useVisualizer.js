import { useEffect, useRef } from 'react';
import { ENGINE } from '../../engine/index.js';
import { BREATH_PATTERNS } from '../constants.js';
import { createRenderer } from '../canvas.js';
import { createWebGLRenderer } from '../webgl.js';
import { useDriftStore } from '../store/useDriftStore.js';

// The single animation loop. The 2D mandala always runs (it advances voice
// progress, strikes and levels the 3D view also reads); the WebGL "space" view
// and the DOM breath overlay run only while immersive in 3D. Reads live state
// non-reactively from the store via getState(); ref-shaped adapters let the
// renderers read immersive/breath/journeyPulse without changing canvas.js.
export function useVisualizer({ canvasRef, glCanvasRef, breathRingRef, breathLabelRef, breathCountRef }) {
  // visual-only internals (written and read inside the loop / renderer)
  const ripplesRef = useRef([]);
  const levRef = useRef({ level: 0, low: 0, high: 0 });
  const bellSeenRef = useRef(0);
  const bellPulseRef = useRef(null);
  const cameraRef = useRef(null);
  const glRendererRef = useRef(null);

  useEffect(() => {
    const store = useDriftStore;
    // adapters that look like refs but proxy to the store
    const immersiveRef = { get current() { return store.getState().immersive; } };
    const breathRef = { get current() { return store.getState().breathOn; } };
    const breathPatRef = { get current() { return store.getState().breathPat; } };
    const journeyPulseRef = {
      get current() { return store.getState().journeyPulse; },
      set current(v) { store.setState({ journeyPulse: v }); },
    };

    let raf;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // headless/unsupported: skip the loop entirely

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height, dpr };
    }
    let dim = resize();
    const onResize = () => { dim = resize(); };
    window.addEventListener("resize", onResize);

    const { draw: drawFrame } = createRenderer({
      ctx, canvas, engine: ENGINE, ripplesRef, levRef, bellSeenRef, bellPulseRef,
      journeyPulseRef, immersiveRef, breathRef, breathPatRef,
    });

    // throttle elapsed updates to ~2/s
    let lastElap = 0;
    function setElapsedThrottled(v) {
      if (Math.abs(v - lastElap) >= 1) { lastElap = v; store.getState().setElapsed(v); }
    }

    function loop() {
      const audioNow = ENGINE.ctx ? ENGINE.ctx.currentTime : performance.now() / 1000;
      const startedAt = store.getState().startedAt;
      if (startedAt && ENGINE.playing) setElapsedThrottled(audioNow - startedAt);
      drawFrame(dim);
      const in3D = store.getState().vizMode === "space" && store.getState().immersive;
      if (in3D && glCanvasRef.current) {
        if (!glRendererRef.current) {
          glRendererRef.current = createWebGLRenderer({ canvas: glCanvasRef.current, engine: ENGINE, levRef, cameraRef });
        }
        if (glRendererRef.current) glRendererRef.current.draw(dim);
        // the 2D mandala draws its own breath guide; in 3D that canvas is hidden,
        // so drive a DOM breath overlay from the same timing here.
        if (store.getState().breathOn && breathRingRef.current) {
          const pat = BREATH_PATTERNS[store.getState().breathPat] || BREATH_PATTERNS.calm;
          let pos = audioNow % pat.total;
          let phase = pat.seq[0], local = 0;
          for (let k = 0; k < pat.seq.length; k++) {
            if (pos < pat.seq[k].d) { phase = pat.seq[k]; local = pos / pat.seq[k].d; break; }
            pos -= pat.seq[k].d;
          }
          const ease = phase.s0 === phase.s1
            ? phase.s0
            : phase.s0 + (phase.s1 - phase.s0) * (0.5 - 0.5 * Math.cos(local * Math.PI));
          breathRingRef.current.style.transform = "translate(-50%,-50%) scale(" + (0.42 + ease * 0.58).toFixed(3) + ")";
          if (breathLabelRef.current) breathLabelRef.current.textContent = phase.label;
          if (breathCountRef.current) breathCountRef.current.textContent = String(Math.max(1, Math.ceil(phase.d - local * phase.d)));
        }
      }
      // 3D spatial audio: place each voice's sound where its orb is. Follows the
      // live camera in the 3D view, a fixed forward stage elsewhere.
      if (ENGINE.spatial && ENGINE.playing) {
        ENGINE.updateSpatial(in3D ? cameraRef.current : null);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (glRendererRef.current) { glRendererRef.current.destroy(); glRendererRef.current = null; }
    };
  }, [canvasRef, glCanvasRef, breathRingRef, breathLabelRef, breathCountRef]);
}

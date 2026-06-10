import { useEffect, useRef, useCallback } from 'react';
import { ENGINE } from '../../engine/index.js';
import { getBreathPattern, entrainLum } from '../constants.js';
import { BINAURAL } from '../../engine/constants.js';
import { createRenderer } from '../canvas.js';
import { createWebGLRenderer } from '../webgl.js';
import { createGanzfeldRenderer } from '../ganzfeld.js';
import { useDriftStore } from '../store/useDriftStore.js';

// Respect the OS "reduce motion" setting for the entrainment flicker — a live
// query, so toggling the system preference takes effect without a reload.
const REDUCE_MOTION_MQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

// The single animation loop. The 2D mandala always runs (it advances voice
// progress, strikes and levels the 3D view also reads); the WebGL "space" view
// and the DOM breath overlay run only while immersive in 3D. Reads live state
// non-reactively from the store via getState(); ref-shaped adapters let the
// renderers read immersive/breath/journeyPulse without changing canvas.js.
export function useVisualizer({ canvasRef, glCanvasRef, ganzfeldCanvasRef, breathRingRef, breathLabelRef, breathCountRef }) {
  // visual-only internals (written and read inside the loop / renderer)
  const ripplesRef = useRef([]);
  const levRef = useRef({ level: 0, low: 0, high: 0 });
  // additive luminance delta (0 = no change) the renderers read each frame, fed
  // by the breath swell + beat-entrainment flicker computed in the loop.
  const modRef = useRef({ lum: 0 });
  const bellSeenRef = useRef(0);
  const bellPulseRef = useRef(null);
  const cameraRef = useRef(null);
  const glRendererRef = useRef(null);
  const ganzfeldRendererRef = useRef(null);

  // imperative ripple emitter, so a tap (play-along) can ring at the touch
  // point. Pushes into the same ripplesRef the renderer animates each frame.
  const emitRipple = useCallback((x, y, max, str, delay) => {
    ripplesRef.current.push({
      x: x, y: y,
      t0: (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) + (delay || 0),
      max: max == null ? 80 : max,
      str: str == null ? 1 : str,
    });
  }, []);

  useEffect(() => {
    const store = useDriftStore;
    // adapters that look like refs but proxy to the store
    const immersiveRef = { get current() { return store.getState().immersive; } };
    const breathRef = { get current() { return store.getState().breathOn; } };
    const breathPatRef = { get current() { return store.getState().breathPat; } };
    const breathRateRef = { get current() { return store.getState().breathRate; } };
    const journeyPulseRef = {
      get current() { return store.getState().journeyPulse; },
      set current(v) { store.setState({ journeyPulse: v }); },
    };
    // the ganzfeld renderer reads its own clock + the live strobe gate; reduce-
    // motion (and the per-session opt-in) decide whether the flicker runs.
    const ganzfeldState = () => {
      const st = store.getState();
      const now = ENGINE.ctx ? ENGINE.ctx.currentTime : performance.now() / 1000;
      return {
        elapsed: now - (st._ganzfeldStartAudio || 0),
        allowStrobe: !!st._ganzfeldStrobe,
        reduceMotion: !!(REDUCE_MOTION_MQ && REDUCE_MOTION_MQ.matches),
      };
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
      journeyPulseRef, immersiveRef, breathRef, breathPatRef, breathRateRef, modRef,
    });

    // throttle elapsed updates to ~2/s
    let lastElap = 0;
    function setElapsedThrottled(v) {
      if (Math.abs(v - lastElap) >= 1) { lastElap = v; store.getState().setElapsed(v); }
    }

    function loop() {
      const audioNow = ENGINE.ctx ? ENGINE.ctx.currentTime : performance.now() / 1000;
      const st = store.getState();
      const startedAt = st.startedAt;
      if (startedAt && ENGINE.playing) setElapsedThrottled(audioNow - startedAt);

      // ---- breath + entrainment modulation -------------------------------
      // computed once per frame: drives the audible breath, the visual swell,
      // and (in 3D) the DOM breath overlay so they always agree.
      let lum = 0, breathPhase = null, breathLocal = 0, breathEase = 0;
      if (st.breathOn) {
        const pat = getBreathPattern(st.breathPat, st.breathRate);
        let pos = audioNow % pat.total;
        breathPhase = pat.seq[0];
        for (let k = 0; k < pat.seq.length; k++) {
          if (pos < pat.seq[k].d) { breathPhase = pat.seq[k]; breathLocal = pos / pat.seq[k].d; break; }
          pos -= pat.seq[k].d;
        }
        breathEase = breathPhase.s0 === breathPhase.s1
          ? breathPhase.s0
          : breathPhase.s0 + (breathPhase.s1 - breathPhase.s0) * (0.5 - 0.5 * Math.cos(breathLocal * Math.PI));
        if (ENGINE.playing) ENGINE.setBreathPhase(breathEase);
        lum += breathEase * 0.10;   // brighten up to +10% on the inhale
      }
      // beat-entrainment flicker: gentle, smooth, and gated off for fast bands
      // (see entrainLum — photosensitivity safety).
      const beatHz = BINAURAL[ENGINE.params.binaural] || 0;
      const entrainOn = st.entrainViz && !(REDUCE_MOTION_MQ && REDUCE_MOTION_MQ.matches);
      lum += entrainLum(entrainOn, beatHz, audioNow);
      modRef.current.lum = lum;

      // ganzfeld owns the screen when active; the mandala/space canvases sit
      // hidden beneath it, so skip their (now-pointless) work entirely.
      const inGanzfeld = st.vizMode === "ganzfeld" && st.immersive;
      if (inGanzfeld) {
        if (ganzfeldCanvasRef && ganzfeldCanvasRef.current) {
          if (!ganzfeldRendererRef.current) {
            ganzfeldRendererRef.current = createGanzfeldRenderer({
              canvas: ganzfeldCanvasRef.current,
              getState: ganzfeldState,
            });
          }
          ganzfeldRendererRef.current.draw(dim);
        }
        raf = requestAnimationFrame(loop);
        return;
      }
      if (ganzfeldRendererRef.current) { ganzfeldRendererRef.current.destroy(); ganzfeldRendererRef.current = null; }

      drawFrame(dim);
      const in3D = st.vizMode === "space" && st.immersive;
      if (in3D && glCanvasRef.current) {
        if (!glRendererRef.current) {
          glRendererRef.current = createWebGLRenderer({ canvas: glCanvasRef.current, engine: ENGINE, levRef, cameraRef, modRef });
        }
        if (glRendererRef.current) glRendererRef.current.draw(dim);
        // the 2D mandala draws its own breath guide; in 3D that canvas is hidden,
        // so drive a DOM breath overlay from the same breath phase here.
        if (st.breathOn && breathPhase && breathRingRef.current) {
          breathRingRef.current.style.transform = "translate(-50%,-50%) scale(" + (0.42 + breathEase * 0.58).toFixed(3) + ")";
          if (breathLabelRef.current) breathLabelRef.current.textContent = breathPhase.label;
          if (breathCountRef.current) breathCountRef.current.textContent = String(Math.max(1, Math.ceil(breathPhase.d - breathLocal * breathPhase.d)));
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
      if (ganzfeldRendererRef.current) { ganzfeldRendererRef.current.destroy(); ganzfeldRendererRef.current = null; }
    };
  }, [canvasRef, glCanvasRef, ganzfeldCanvasRef, breathRingRef, breathLabelRef, breathCountRef]);

  return { emitRipple };
}

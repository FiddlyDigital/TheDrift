import { useEffect } from 'react';
import { ENGINE } from '../../engine/index.js';
import { MOOD_VIZ } from '../glyphs.jsx';
import { createSpectrogram, createVectorscope } from '../scopes.js';
import { useDriftStore } from '../store/useDriftStore.js';

// One animation loop driving both Atelier scopes. Mirrors useVisualizer's
// lifecycle: grab 2D contexts (no-op if headless), DPR-resize with a transform,
// listen for window resize, then a single rAF loop that reads the store
// non-reactively and only draws while the Atelier tab is showing. The renderers
// themselves handle the idle case (no live context / paused).
export function useScopes({ specCanvasRef, vectorCanvasRef }) {
  useEffect(() => {
    const specCanvas = specCanvasRef.current;
    const vecCanvas = vectorCanvasRef.current;
    if (!specCanvas || !vecCanvas) return;
    const sctx = specCanvas.getContext("2d");
    const vctx = vecCanvas.getContext("2d");
    if (!sctx || !vctx) return;   // jsdom/headless: skip entirely

    const getPalette = () => MOOD_VIZ[ENGINE.params.mood] || MOOD_VIZ.reflection;

    const spec = createSpectrogram({
      ctx: sctx, canvas: specCanvas,
      getAnalyser: () => { const s = ENGINE.getScopeAnalysers(); return s && s.spec; },
      getPalette,
    });
    const vector = createVectorscope({
      ctx: vctx, canvas: vecCanvas,
      getAnalyser: () => { const s = ENGINE.getScopeAnalysers(); return s && { left: s.left, right: s.right }; },
      getPalette,
    });

    function resize(canvas, c2d) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height, dpr };
    }
    let specDim = resize(specCanvas, sctx);
    let vecDim = resize(vecCanvas, vctx);
    spec.reset();   // the spectrogram owns its image buffer; fill it on (re)size
    const onResize = () => { specDim = resize(specCanvas, sctx); vecDim = resize(vecCanvas, vctx); spec.reset(); };
    window.addEventListener("resize", onResize);

    let raf;
    let lastMood = ENGINE.params.mood;
    function loop() {
      const st = useDriftStore.getState();
      if (st.section === "atelier") {
        if (ENGINE.params.mood !== lastMood) { lastMood = ENGINE.params.mood; spec.reset(); }
        spec.draw(specDim);
        vector.draw(vecDim);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [specCanvasRef, vectorCanvasRef]);
}

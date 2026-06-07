import { useEffect } from 'react';
import { ENGINE } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';
import { tapToField, LONG_PRESS_MS, MOVE_TOL } from '../playAlong.js';

// "Play along": while enabled in the immersive mandala, a tap drops an in-scale
// note (vertical = pitch, horizontal = pan) and a long-press or second finger
// drops a short glitch gesture. Synthesis goes through ENGINE.dropNote, which
// never touches the scheduler, so the generative field keeps running.
export function usePlayAlong({ canvasRef, emitRipple }) {
  const playAlong = useDriftStore((s) => s.playAlong);
  const immersive = useDriftStore((s) => s.immersive);
  const vizMode = useDriftStore((s) => s.vizMode);

  useEffect(() => {
    if (!playAlong || !immersive || vizMode !== "mandala") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active = new Set();          // live pointer ids (for two-finger)
    let start = null;                  // primary pointer { id, cx, cy, t, moved }
    let handled = false;               // a glitch already fired for this press
    let longTimer = null;

    const fire = (glitch) => {
      if (!ENGINE.playing || !start) return;
      const r = canvas.getBoundingClientRect();
      const x = start.cx - r.left, y = start.cy - r.top;
      const { pitch01, pan } = tapToField(x, y, r.width, r.height);
      const hit = ENGINE.dropNote({ pitch01, pan, glitch });
      if (!hit) return;
      const max = 70 + (1 - (hit.midi - 40) / 44) * 90;
      emitRipple(x, y, max, glitch ? 1.2 : 0.9);
      if (glitch) {
        const bursts = 3 + Math.floor(Math.random() * 3);
        for (let s = 1; s <= bursts; s++) emitRipple(x, y, 34, 0.5, s * 0.06);
      }
    };

    const clearLong = () => { if (longTimer) { clearTimeout(longTimer); longTimer = null; } };

    const onDown = (e) => {
      active.add(e.pointerId);
      if (start == null) {
        start = { id: e.pointerId, cx: e.clientX, cy: e.clientY, t: performance.now(), moved: false };
        handled = false;
        clearLong();
        // capture so pointerup/move still land here if the finger drifts off-canvas
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        longTimer = setTimeout(() => { handled = true; fire(true); }, LONG_PRESS_MS);
        if (e.cancelable) e.preventDefault();
      } else if (!handled) {
        // a second finger landed -> glitch
        handled = true; clearLong(); fire(true);
      }
    };
    const onMove = (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (Math.abs(e.clientX - start.cx) > MOVE_TOL || Math.abs(e.clientY - start.cy) > MOVE_TOL) {
        start.moved = true; clearLong();          // a drag, not a tap
      }
    };
    const onUp = (e) => {
      active.delete(e.pointerId);
      if (!start || e.pointerId !== start.id) return;
      clearLong();
      if (!handled && !start.moved) fire(false);  // a clean tap -> note
      start = null;
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      clearLong();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [playAlong, immersive, vizMode, canvasRef, emitRipple]);
}

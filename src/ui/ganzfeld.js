import { ganzfeldVisualAt, ganzfeldStrobeLum, GANZFELD_GRAIN_MAX } from './constants.js';

/* The Drift — Ganzfeld renderer.
   A deliberately featureless field: a deep, slowly hue-drifting colour wash with
   a soft peripheral vignette (so the screen's edges dissolve) and a sub-threshold
   luminance grain that gives the eye nothing to lock onto. In the deep phase an
   optional, bounded flicker can ride the field's brightness. Pure 2D canvas, all
   timing read from the store via getState(); nothing here touches the audio. */

// HSL (h,s,l in 0..1) -> [r,g,b] 0..255
function hslToRgb(h, s, l) {
  if (s <= 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2 = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(hue2(h + 1 / 3) * 255), Math.round(hue2(h) * 255), Math.round(hue2(h - 1 / 3) * 255)];
}

// a small grayscale noise tile, rendered once and re-blitted for the grain
function buildNoiseTile(n) {
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d");
  if (!x) return c;
  const img = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = (Math.random() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function createGanzfeldRenderer({ canvas, getState }) {
  const ctx = canvas.getContext("2d");
  const TILE = 96;
  const noise = buildNoiseTile(TILE);
  let pattern = null;

  function draw(dim) {
    if (!ctx) return;
    const w = dim.w, h = dim.h, dpr = dim.dpr;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    const st = getState();
    const v = ganzfeldVisualAt(st.elapsed);

    // base field, with the bounded flicker riding its lightness in the deep phase
    let light = v.light;
    if (v.strobe > 0) {
      const lum = ganzfeldStrobeLum(st.allowStrobe, st.elapsed, st.reduceMotion) * v.strobe;
      light = Math.max(0, Math.min(1, light * (1 + lum)));
    }
    const rgb = hslToRgb(((v.hue % 360) + 360) % 360 / 360, v.sat, light);
    ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    ctx.fillRect(0, 0, w, h);

    // peripheral vignette — darken toward the edges so the bezel dissolves and
    // the field reads as boundless rather than a lit rectangle
    if (v.vig > 0) {
      const cx = w / 2, cy = h / 2, rad = Math.hypot(w, h) / 2;
      const grad = ctx.createRadialGradient(cx, cy, rad * 0.25, cx, cy, rad);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0," + v.vig.toFixed(3) + ")");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // sub-threshold grain — a faint living shimmer re-blitted at a jittered
    // offset each frame; capped so it never reads as a feature
    if (v.grain > 0) {
      if (!pattern) pattern = ctx.createPattern(noise, "repeat");
      if (pattern) {
        const ox = (Math.random() * TILE) | 0, oy = (Math.random() * TILE) | 0;
        ctx.globalAlpha = v.grain * GANZFELD_GRAIN_MAX;
        ctx.globalCompositeOperation = "overlay";
        ctx.translate(-ox, -oy);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w + TILE, h + TILE);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  function destroy() { pattern = null; }
  return { draw, destroy };
}

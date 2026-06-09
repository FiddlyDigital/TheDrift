/* The Drift — Atelier scopes: a scrolling Voice Spectrogram and a Lissajous
   stereo Vectorscope. Both are canvas-2D renderer factories in the same shape
   as createRenderer (src/canvas.js): each returns { draw, reset } and draw(dim)
   is called per frame with { w, h, dpr }.

   They read live audio through a `getAnalyser` callback (returns null when audio
   isn't running yet, so the scopes idle gracefully before first play) and tint
   to the current mood via a `getPalette` callback ({ bg:[hex,hex], ink:"r,g,b",
   acc:"r,g,b" } from MOOD_VIZ). */

import { ENGINE } from '../engine/index.js';

// "#0c0905" -> "12,9,5". Cached per call site via the renderer's lastBg guard.
function hexToRgb(hex) {
  const h = (hex || "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
}
const rgbParts = (s) => s.split(",").map(Number);

// ---- Spectrogram -----------------------------------------------------------
// Frequency (vertical, low at the bottom) × time (horizontal, newest at the
// right), energy as brightness. Operates in DEVICE pixels: the hook applies a
// dpr transform for crisp text elsewhere, but a scrolling self-blit must run
// untransformed or it smears, so we reset to identity here.
const SUB_BAND_BINS = 256;   // of 1024 (fft 2048) ≈ up to ~5.5 kHz — ambient energy sits low

export function createSpectrogram({ ctx, canvas, getAnalyser, getPalette }) {
  let freq = null;
  let bg1 = "#0c0905";

  function reset() {
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = (getPalette() || {}).bg ? getPalette().bg[1] : bg1;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    const pal = getPalette();
    const a = getAnalyser();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!a || !ENGINE.playing) { ctx.restore(); return; }  // idle: hold the image

    // scroll the existing image one device-pixel to the left
    ctx.drawImage(canvas, 1, 0, W - 1, H, 0, 0, W - 1, H);

    if (!freq || freq.length !== a.frequencyBinCount) freq = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(freq);

    const ink = rgbParts(pal.ink), acc = rgbParts(pal.acc);
    bg1 = pal.bg[1];
    const maxBin = Math.min(SUB_BAND_BINS, freq.length) - 1;
    for (let y = 0; y < H; y++) {
      const t = 1 - y / H;                  // 0 bottom .. 1 top
      const binF = (t * t) * maxBin;        // weight the low end (drones get room)
      const i = binF | 0, f = binF - i;
      const s0 = freq[i] || 0, s1 = freq[i + 1] != null ? freq[i + 1] : s0;
      let v = (s0 + (s1 - s0) * f) / 255;    // 0..1, interpolated
      if (v < 0.04) {
        ctx.fillStyle = bg1;
      } else {
        v = Math.pow(v, 0.7);               // lift quiet detail
        const r = (ink[0] + (acc[0] - ink[0]) * v) * v;
        const g = (ink[1] + (acc[1] - ink[1]) * v) * v;
        const b = (ink[2] + (acc[2] - ink[2]) * v) * v;
        ctx.fillStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
      }
      ctx.fillRect(W - 1, y, 1, 1);
    }
    ctx.restore();
  }

  return { draw, reset };
}

// ---- Vectorscope -----------------------------------------------------------
// X-Y goniometer: left vs right, rotated 45° so a mono signal (L==R) draws a
// vertical line and an anti-phase signal draws a horizontal one. A translucent
// fill each frame gives the classic phosphor-trail persistence — so this canvas
// must NOT be cleared by the hook.
export function createVectorscope({ ctx, canvas, getAnalyser, getPalette }) {
  let tdL = null, tdR = null;
  let lastBg = null, bgRgb = "12,9,5";
  let agc = 1;   // smoothed auto-gain so a quiet mix still fills the panel

  function reset() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function draw({ w, h }) {
    const pal = getPalette();
    if (pal.bg[1] !== lastBg) { lastBg = pal.bg[1]; bgRgb = hexToRgb(lastBg); }

    // phosphor persistence: fade the whole panel toward the dark background
    ctx.fillStyle = "rgba(" + bgRgb + ",0.18)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const a = getAnalyser();
    if (!a || !a.left || !a.right || !ENGINE.playing) {
      // idle: a faint centre cross so the panel reads as "armed"
      ctx.strokeStyle = "rgba(" + pal.acc + ",0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
      ctx.stroke();
      return;
    }

    const n = a.left.fftSize;
    if (!tdL || tdL.length !== n) { tdL = new Uint8Array(n); tdR = new Uint8Array(n); }
    a.left.getByteTimeDomainData(tdL);
    a.right.getByteTimeDomainData(tdR);

    // auto-gain: the ambient output sits low, so normalise to the current peak
    // — the figure's shape matters more here than its absolute level.
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const al = Math.abs(tdL[i] - 128), ar = Math.abs(tdR[i] - 128);
      if (al > peak) peak = al;
      if (ar > peak) peak = ar;
    }
    peak /= 128;                                       // 0..1
    const want = peak > 0.004 ? 0.95 / peak : agc;     // hold gain through near-silence
    agc += (Math.min(want, 60) - agc) * 0.12;          // smoothed + capped

    const R0 = Math.min(w, h) * 0.26;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const L = ((tdL[i] - 128) / 128) * agc;
      const R = ((tdR[i] - 128) / 128) * agc;
      const x = cx + (L - R) * R0;
      const y = cy - (L + R) * R0;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    // glow via two passes — cheaper and softer than per-frame shadowBlur
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(" + pal.acc + ",0.10)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "rgba(" + pal.acc + ",0.55)"; ctx.lineWidth = 1; ctx.stroke();
  }

  return { draw, reset };
}

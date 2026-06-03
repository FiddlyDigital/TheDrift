/* Loops — UI + canvas visualization */
const { useState, useEffect, useRef, useCallback } = React;

const ENGINE = new AmbientEngine();

// ---- descriptive labels for the abstract dials -----------------------
function tempoLabel(v) {
  if (v < 0.2) return "glacial";
  if (v < 0.42) return "slow";
  if (v < 0.62) return "flowing";
  if (v < 0.82) return "moving";
  return "brisk";
}
function stutterLabel(v) {
  if (v < 0.04) return "none";
  if (v < 0.25) return "rare";
  if (v < 0.5) return "occasional";
  if (v < 0.78) return "frequent";
  return "restless";
}
function bloomLabel(v) {
  if (v < 0.04) return "pure";
  if (v < 0.28) return "glassy";
  if (v < 0.55) return "shimmering";
  if (v < 0.8) return "ringing";
  return "colliding";
}
function driftLabel(v) {
  if (v < 0.2) return "nearly even";
  if (v < 0.45) return "loosening";
  if (v < 0.7) return "unequal";
  if (v < 0.88) return "wide";
  return "scattered";
}
function registerLabel(v) {
  if (v < 0.2) return "deep";
  if (v < 0.42) return "low";
  if (v < 0.62) return "middle";
  if (v < 0.82) return "high";
  return "glassy";
}
function spaceLabel(v) {
  if (v < 0.2) return "close";
  if (v < 0.45) return "room";
  if (v < 0.7) return "hall";
  if (v < 0.88) return "cathedral";
  return "endless";
}
function colorLabel(v) {
  if (v < 0.22) return "felt, muted";
  if (v < 0.45) return "soft";
  if (v < 0.68) return "warm";
  if (v < 0.86) return "open";
  return "bright";
}
function evolveLabel(v) {
  if (v < 0.04) return "fixed";
  if (v < 0.3) return "slow drift";
  if (v < 0.6) return "wandering";
  if (v < 0.85) return "shifting";
  return "restless";
}
function journeyLabel(v) {
  if (v < 0.04) return "off";
  if (v < 0.34) return "unfolding";
  if (v < 0.66) return "drifting";
  if (v < 0.88) return "roaming";
  return "restless";
}
function texlevelLabel(v) {
  if (v < 0.18) return "faint";
  if (v < 0.42) return "soft";
  if (v < 0.68) return "present";
  if (v < 0.86) return "forward";
  return "immersive";
}
function glueLabel(v) {
  if (v < 0.04) return "transparent";
  if (v < 0.3) return "gentle";
  if (v < 0.58) return "firm";
  if (v < 0.84) return "pressed";
  return "pumping";
}
function binlevelLabel(v) {
  if (v < 0.18) return "faint";
  if (v < 0.45) return "soft";
  if (v < 0.72) return "present";
  return "strong";
}
// raw gain faders (master, loops) read most clearly as a percentage
function pctLabel(v) { return Math.round(v * 100) + "%"; }

// binaural-beat bands — each entry's hz is the perceived beat rate
const BRAINWAVES = [
  { id: "off",   name: "Off" },
  { id: "delta", name: "Delta", hz: "2.5 Hz", note: "deep rest" },
  { id: "theta", name: "Theta", hz: "6 Hz",   note: "meditation" },
  { id: "alpha", name: "Alpha", hz: "10 Hz",  note: "calm focus" },
  { id: "beta",  name: "Beta",  hz: "18 Hz",  note: "alert focus" },
];

// ---- breath synchronization patterns ---------------------------------
// each is a sequence of phases {d: seconds, s0->s1: lung-fullness 0..1, label}.
// the mandala draws a ring that scales with fullness, so a meditator can pace
// their breath to it. Times are eased (cosine) for a natural rise and fall.
function makeBreath(inT, hold1, outT, hold2) {
  const seq = [{ d: inT, s0: 0, s1: 1, label: "Breathe in" }];
  if (hold1 > 0) seq.push({ d: hold1, s0: 1, s1: 1, label: "Hold" });
  seq.push({ d: outT, s0: 1, s1: 0, label: "Breathe out" });
  if (hold2 > 0) seq.push({ d: hold2, s0: 0, s1: 0, label: "Hold" });
  return { seq, total: inT + hold1 + outT + hold2 };
}
const BREATH_PATTERNS = {
  calm: Object.assign(makeBreath(5.5, 0, 5.5, 0), { name: "Coherent" }),  // ~5.5 breaths/min
  box:  Object.assign(makeBreath(4, 4, 4, 4),     { name: "Box" }),       // 4-4-4-4
  "478":Object.assign(makeBreath(4, 7, 8, 0),     { name: "4-7-8" }),     // relaxing
};
const BREATH_ORDER = ["calm", "box", "478"];

// ---- tuning: reference pitch A4 --------------------------------------
// a low->high spectrum of reference pitches. 432 Hz ("natural"/Verdi) and
// A4=444 (which tunes C to exactly 528 Hz, the Solfeggio "transformation"
// tone) are the wellness favourites; 415/448 round out the range.
const TUNINGS = [
  { hz: 415, name: "415 Hz", note: "baroque, mellow",   title: "A4 = 415 Hz \u00b7 historical period tuning, a soft semitone down" },
  { hz: 432, name: "432 Hz", note: "natural, grounding",title: "A4 = 432 Hz \u00b7 the \u201cnatural\u201d/Verdi tuning" },
  { hz: 440, name: "440 Hz", note: "concert standard",  title: "A4 = 440 Hz \u00b7 modern concert pitch" },
  { hz: 444, name: "528 Hz", note: "transformation",    title: "A4 = 444 Hz \u00b7 tunes C to 528 Hz (Solfeggio MI)" },
  { hz: 448, name: "448 Hz", note: "bright, lifting",    title: "A4 = 448 Hz \u00b7 a brilliant, slightly sharp tuning" },
];

// control panel is split into calm, focused groups (progressive disclosure)
// so all 13 dials + preset rows aren't dumped on screen at once.
const SECTIONS = [
  { id: "scenes", name: "Scenes" },
  { id: "voice",  name: "Voice" },
  { id: "motion", name: "Motion" },
  { id: "space",  name: "Space" },
  { id: "atmos",  name: "Atmosphere" },
  { id: "mixer",  name: "Mixer" },
];

// synthesized ambience layers — combine freely under the music
const TEXTURES = [
  { id: "rain", name: "Rain" },
  { id: "vinyl", name: "Vinyl" },
  { id: "wind", name: "Wind" },
  { id: "fire", name: "Fire" },
  { id: "static", name: "Static" },
  { id: "tape", name: "Tape hiss" },
  { id: "white", name: "White noise" },
  { id: "pink", name: "Pink noise" },
  { id: "brown", name: "Brown noise" },
];

// ---- persistence -----------------------------------------------------
const KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "space", "color", "stutter", "bloom", "evolve", "journey", "glue", "tuning", "binaural", "binlevel", "texture", "texlevel", "looplevel", "seed"];
const STR_KEYS = { mood: "reflection", ensemble: "piano", binaural: "off", texture: "" };
const INT_KEYS = { density: true, seed: true };
const NUM_DEFAULTS = { density: 6, tempo: 0.5, drift: 0.55, register: 0.5, space: 0.6, color: 0.5, stutter: 0.15, bloom: 0.2, evolve: 0.4, journey: 0, glue: 0.25, tuning: 440, binlevel: 0.4, texlevel: 0.5, looplevel: 1, seed: 1148 };
function readConfig() {
  const hash = location.hash.replace(/^#/, "");
  const sp = new URLSearchParams(hash);
  let any = false;
  const out = {};
  for (const k of KEYS) if (sp.has(k)) { out[k] = sp.get(k); any = true; }
  if (!any) {
    try {
      const s = localStorage.getItem("loops.config");
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }
  const cfg = {};
  for (const k of KEYS) {
    if (STR_KEYS[k] != null) cfg[k] = out[k] || STR_KEYS[k];
    else cfg[k] = out[k] != null && out[k] !== "" ? +out[k] : NUM_DEFAULTS[k];
  }
  return cfg;
}
function persist(p) {
  try { localStorage.setItem("loops.config", JSON.stringify(p)); } catch (e) {}
  const sp = new URLSearchParams();
  for (const k of KEYS) {
    if (STR_KEYS[k] != null || INT_KEYS[k]) sp.set(k, p[k]);
    else sp.set(k, (+p[k]).toFixed(2));
  }
  history.replaceState(null, "", "#" + sp.toString());
}

// ---- personal library: keep the drifts you love ---------------------
// Each saved entry captures the FULL setup (every dial + seed), so recalling
// it returns to the exact field you kept — including the one-in-99,999 seed
// a reshuffle happened to land on.
const LIB_KEY = "loops.library";
function readLibrary() {
  try { const s = localStorage.getItem(LIB_KEY); return s ? JSON.parse(s) : []; }
  catch (e) { return []; }
}
function writeLibrary(list) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch (e) {}
}
function snapshotName(p) {
  const mood = AmbientEngine.MOODS[p.mood] ? AmbientEngine.MOODS[p.mood].name : "Drift";
  const ens = AmbientEngine.ENSEMBLES[p.ensemble] ? AmbientEngine.ENSEMBLES[p.ensemble].name : "";
  return ens ? mood + " \u00b7 " + ens : mood;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---- instrument glyphs (canvas) --------------------------------------
function drawGlyph(ctx, family, x, y, r, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.3;
  switch (family) {
    case "bell": // filled diamond
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); break;
    case "marimba": // filled square
      ctx.fillRect(x - r * 0.82, y - r * 0.82, r * 1.64, r * 1.64); break;
    case "harp": // ring
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); break;
    case "handpan": // tone-field dimple: ring with a filled centre
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill(); break;
    case "kalimba": // upright tine: a thin vertical bar
      ctx.fillRect(x - r * 0.3, y - r, r * 0.6, r * 2); break;
    case "wood": // wooden plank: a flat horizontal bar
      ctx.fillRect(x - r, y - r * 0.42, r * 2, r * 0.84); break;
    case "frame": // drum head seen at an angle: a flat ellipse
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); break;
    case "strings": // open diamond
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.stroke(); break;
    case "choir": // filled triangle up
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.92, y + r * 0.72); ctx.lineTo(x - r * 0.92, y + r * 0.72); ctx.closePath(); ctx.fill(); break;
    case "flute": // hollow square
      ctx.strokeRect(x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56); break;
    case "drone": // filled triangle down
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x + r * 0.92, y - r * 0.72); ctx.lineTo(x - r * 0.92, y - r * 0.72); ctx.closePath(); ctx.fill(); break;
    case "chip": { // 8-bit pixel staircase
      const u = r * 0.62;
      const bx = x - u * 1.5, by = y + u * 1.5;
      ctx.fillRect(bx, by - u, u, u);
      ctx.fillRect(bx + u, by - 2 * u, u, u);
      ctx.fillRect(bx + 2 * u, by - 3 * u, u, u);
      break;
    }
    case "tabla": { // tuned drum: filled hexagon
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 3;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); break;
    }
    case "udu": // clay pot: body + small neck opening
      ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - r * 0.92, r * 0.34, 0, Math.PI * 2); ctx.stroke(); break;
    case "balafon": { // wooden bars: three vertical keys, middle tallest
      const bw = r * 0.42, gap = r * 0.52;
      for (let k = -1; k <= 1; k++) {
        const hh = r * (k === 0 ? 1.0 : 0.78);
        ctx.fillRect(x + k * gap - bw / 2, y - hh, bw, hh * 2);
      }
      break;
    }
    case "bowl": // singing bowl: lower half-disc
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r, 0, Math.PI, false); ctx.closePath(); ctx.fill(); break;
    default: // piano: filled circle
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}
const FAMILY_LABEL = { piano: "Felt piano", bell: "Bells", marimba: "Marimba", harp: "Harp", handpan: "Handpan", kalimba: "Kalimba", wood: "Woodblock", frame: "Frame drum", strings: "Strings", choir: "Choir", flute: "Flute", drone: "Drone", chip: "8-bit pulse", tabla: "Tabla", udu: "Udu", balafon: "Balafon", bowl: "Singing bowl" };

// ---- per-mood visualization palette (deep tint + luminous accent) ----
// bg = [centre, edge] radial; ink = faint structure; acc = glowing strokes.
const MOOD_VIZ = {
  reflection: { bg: ["#1a140c", "#0c0905"], ink: "214,198,170", acc: "228,152,94" },  // warm amber
  drift:      { bg: ["#07191b", "#040c0d"], ink: "168,208,212", acc: "84,206,214" },  // airy cyan
  dusk:       { bg: ["#120e22", "#070512"], ink: "188,178,222", acc: "150,128,238" }, // indigo
  elegy:      { bg: ["#1d0d14", "#0e0609"], ink: "220,180,194", acc: "232,108,140" }, // muted rose
  suspended:  { bg: ["#141a0c", "#090d05"], ink: "200,208,168", acc: "182,200,92" },  // green-gold
  curious:    { bg: ["#07190f", "#040c08"], ink: "176,216,192", acc: "76,216,150" },  // bright teal
  pensive:    { bg: ["#0b1320", "#05080f"], ink: "182,198,224", acc: "108,160,238" }, // soft blue
  open:       { bg: ["#091a18", "#040d0c"], ink: "182,216,208", acc: "92,214,198" },  // seafoam aqua
  vast:       { bg: ["#110c20", "#070510"], ink: "196,184,226", acc: "150,128,242" }, // aurora violet
};

// ---- instrument glyphs (svg, for the DOM legend) ---------------------
function GlyphSVG({ family }) {
  const ink = "#2c271f";
  const p = { width: 12, height: 12, viewBox: "0 0 12 12" };
  switch (family) {
    case "bell": return (<svg {...p}><path d="M6 1 11 6 6 11 1 6Z" fill={ink} /></svg>);
    case "marimba": return (<svg {...p}><rect x="1.7" y="1.7" width="8.6" height="8.6" fill={ink} /></svg>);
    case "harp": return (<svg {...p}><circle cx="6" cy="6" r="4.4" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "handpan": return (<svg {...p}><circle cx="6" cy="6" r="4.4" fill="none" stroke={ink} strokeWidth="1.3" /><circle cx="6" cy="6" r="1.8" fill={ink} /></svg>);
    case "kalimba": return (<svg {...p}><rect x="4.6" y="1.4" width="2.8" height="9.2" fill={ink} /></svg>);
    case "wood": return (<svg {...p}><rect x="1.4" y="4.4" width="9.2" height="3.2" fill={ink} /></svg>);
    case "frame": return (<svg {...p}><ellipse cx="6" cy="6" rx="4.8" ry="2.9" fill={ink} /></svg>);
    case "strings": return (<svg {...p}><path d="M6 1 11 6 6 11 1 6Z" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "choir": return (<svg {...p}><path d="M6 1.4 10.6 10 1.4 10Z" fill={ink} /></svg>);
    case "flute": return (<svg {...p}><rect x="1.8" y="1.8" width="8.4" height="8.4" fill="none" stroke={ink} strokeWidth="1.3" /></svg>);
    case "drone": return (<svg {...p}><path d="M6 10.6 10.6 2 1.4 2Z" fill={ink} /></svg>);
    case "chip": return (<svg {...p}><rect x="1.4" y="6.6" width="3" height="3" fill={ink} /><rect x="4.5" y="4.5" width="3" height="3" fill={ink} /><rect x="7.6" y="2.4" width="3" height="3" fill={ink} /></svg>);
    case "tabla": return (<svg {...p}><path d="M6 1.2 10.2 3.6 10.2 8.4 6 10.8 1.8 8.4 1.8 3.6Z" fill={ink} /></svg>);
    case "udu": return (<svg {...p}><circle cx="6" cy="7" r="4.1" fill={ink} /><circle cx="6" cy="2.2" r="1.5" fill="none" stroke={ink} strokeWidth="1.1" /></svg>);
    case "balafon": return (<svg {...p}><rect x="1.7" y="3" width="1.9" height="6" fill={ink} /><rect x="5.05" y="1.6" width="1.9" height="8.8" fill={ink} /><rect x="8.4" y="3" width="1.9" height="6" fill={ink} /></svg>);
    case "bowl": return (<svg {...p}><path d="M1.4 4.6 A4.6 4.6 0 0 1 10.6 4.6 Z" fill={ink} /></svg>);
    default: return (<svg {...p}><circle cx="6" cy="6" r="4.6" fill={ink} /></svg>);
  }
}

// ---- icons -----------------------------------------------------------
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" /><rect x="13.6" y="5.5" width="3.4" height="13" /></svg>
);
const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" /><path d="M3 8.5 12 13l9-4.5M12 13v7" />
  </svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1" />
  </svg>
);
const InstallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18.5h14" />
  </svg>
);
const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9V5.5a1.5 1.5 0 0 1 1.5-1.5H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);
const FullscreenExitIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </svg>
);
const VizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="12" cy="3.2" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16.6" cy="14.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

const ReturnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 5l-7 7 7 7" />
  </svg>
);
const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M4 9v6h3.5L13 19V5L7.5 9z" fill="currentColor" stroke="none" />
    <path d="M16.4 9.2a4 4 0 0 1 0 5.6M18.7 7a7 7 0 0 1 0 10" strokeLinecap="round" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
  </svg>
);
const BreathIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="6.4" opacity="0.7" />
    <circle cx="12" cy="12" r="9.6" opacity="0.4" />
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M6 16.5c1-.9 1.6-2.3 1.6-4.2V11a4.4 4.4 0 0 1 8.8 0v1.3c0 1.9.6 3.3 1.6 4.2z" />
    <path d="M10.4 19.4a1.8 1.8 0 0 0 3.2 0" />
  </svg>
);
const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5 7h9M18 7h1M5 12h1M10 12h9M5 17h12M20 17h-1" />
    <circle cx="16" cy="7" r="2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="17" r="2" fill="currentColor" stroke="none" />
  </svg>
);
const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" />
    <path d="M8 17h6.5A3.5 3.5 0 0 0 18 13.5V8.2" strokeDasharray="0.1 3" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 19h14" />
  </svg>
);
const SunriseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18h16" />
    <path d="M7 14a5 5 0 0 1 10 0" />
    <path d="M12 4v3" /><path d="M5 8l1.5 1.5" /><path d="M19 8l-1.5 1.5" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.5a1 1 0 0 1 1-1z" />
  </svg>
);

// ---- curated scenes: one tap sets the whole instrument ---------------
// the dials are the thing you graduate to; these are the way in. The set is
// designed to span the full instrument — every mood, every ensemble, every
// ambience layer, all five brainwave bands (delta→theta→alpha→beta) and all
// five tunings appear at least once — and to read as a journey of states,
// from deepest sleep up through meditation, flow and ceremony.
const SCENES = [
  // deep sleep — delta, hushed felt piano, baroque-mellow tuning, rain over a brown bed
  { name: "Deep Rest",   p: { mood: "elegy",      ensemble: "piano",     density: 4, tempo: 0.12, drift: 0.58, register: 0.20, space: 0.92, color: 0.26, stutter: 0.00, bloom: 0.10, evolve: 0.22, journey: 0.00, glue: 0.15, tuning: 415, binaural: "delta", binlevel: 0.42, texture: "rain.brown", texlevel: 0.42, looplevel: 0.84 } },
  // seated meditation — theta, open choir, grounding 432, wind
  { name: "Stillness",   p: { mood: "open",       ensemble: "choir",     density: 5, tempo: 0.20, drift: 0.50, register: 0.46, space: 0.80, color: 0.42, stutter: 0.00, bloom: 0.14, evolve: 0.28, journey: 0.00, glue: 0.20, tuning: 432, binaural: "theta", binlevel: 0.42, texture: "wind",        texlevel: 0.34, looplevel: 0.92 } },
  // heart-opening / healing — theta, warm handpan, 528 transformation tuning, fire
  { name: "Inner Sun",   p: { mood: "vast",       ensemble: "handpan",   density: 7, tempo: 0.40, drift: 0.66, register: 0.48, space: 0.74, color: 0.60, stutter: 0.04, bloom: 0.40, evolve: 0.50, journey: 0.30, glue: 0.40, tuning: 444, binaural: "theta", binlevel: 0.30, texture: "fire",        texlevel: 0.30, looplevel: 1 } },
  // drifting in and out of phase — soft kalimba & frame drums, rain
  { name: "Tide",        p: { mood: "drift",      ensemble: "percussion",density: 7, tempo: 0.34, drift: 0.78, register: 0.42, space: 0.70, color: 0.52, stutter: 0.06, bloom: 0.20, evolve: 0.45, journey: 0.22, glue: 0.28, tuning: 432, binaural: "off",   binlevel: 0.40, texture: "rain",        texlevel: 0.40, looplevel: 1 } },
  // calm focus — alpha, steady strings, pink noise, standard pitch
  { name: "Clear Mind",  p: { mood: "suspended",  ensemble: "strings",   density: 6, tempo: 0.42, drift: 0.40, register: 0.52, space: 0.50, color: 0.50, stutter: 0.00, bloom: 0.12, evolve: 0.26, journey: 0.00, glue: 0.30, tuning: 440, binaural: "alpha", binlevel: 0.34, texture: "pink",        texlevel: 0.30, looplevel: 1 } },
  // alert flow — beta, bright glasswork, a breath of white noise
  { name: "Quickening",  p: { mood: "curious",    ensemble: "glasswork", density: 8, tempo: 0.58, drift: 0.48, register: 0.60, space: 0.46, color: 0.74, stutter: 0.08, bloom: 0.34, evolve: 0.40, journey: 0.10, glue: 0.38, tuning: 440, binaural: "beta",  binlevel: 0.30, texture: "white",       texlevel: 0.22, looplevel: 1 } },
  // nostalgic dusk — gentle 8-bit, tape hiss & static
  { name: "Arcade Dusk", p: { mood: "pensive",    ensemble: "eightbit",  density: 6, tempo: 0.50, drift: 0.55, register: 0.56, space: 0.60, color: 0.62, stutter: 0.10, bloom: 0.24, evolve: 0.46, journey: 0.40, glue: 0.34, tuning: 440, binaural: "off",   binlevel: 0.40, texture: "tape.static", texlevel: 0.34, looplevel: 1 } },
  // ceremonial migration — world percussion, wandering journey, bright 448, wind
  { name: "Procession",  p: { mood: "dusk",       ensemble: "world",     density: 9, tempo: 0.56, drift: 0.70, register: 0.44, space: 0.68, color: 0.55, stutter: 0.12, bloom: 0.22, evolve: 0.50, journey: 0.60, glue: 0.42, tuning: 448, binaural: "off",   binlevel: 0.40, texture: "wind",        texlevel: 0.40, looplevel: 1 } },
  // the full orchestra, slowly re-voicing under warm vinyl — a long evening listen
  { name: "Reverie",     p: { mood: "reflection", ensemble: "orchestra", density: 10,tempo: 0.44, drift: 0.64, register: 0.50, space: 0.78, color: 0.58, stutter: 0.06, bloom: 0.30, evolve: 0.60, journey: 0.40, glue: 0.50, tuning: 432, binaural: "off",   binlevel: 0.40, texture: "vinyl",       texlevel: 0.32, looplevel: 1 } },
];
const SCENE_DIAL_KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "space", "color", "stutter", "bloom", "evolve", "journey", "glue", "tuning", "binaural", "binlevel", "texture", "texlevel", "looplevel"];
const SCENE_BY_NAME = {};
SCENES.forEach((s) => { SCENE_BY_NAME[s.name] = s; });

// ---- journeys: programmed arcs that travel between scenes over time -------
// A journey is an ordered list of scene "stops". Between two stops we glide the
// cheap, continuous parameters (space, colour, glue, levels…) smoothly, and
// snap the expensive ones (mood, ensemble, tempo, texture…) at each waypoint
// with a single crossfade — so the soundscape *sinks* rather than cutting.
// STEP keys force a loop-field regenerate; CONT keys are read live each tick.
const JOURNEY_STEP_KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "texture", "binaural", "tuning"];
const JOURNEY_CONT_KEYS = ["space", "color", "stutter", "bloom", "evolve", "glue", "binlevel", "texlevel", "looplevel"];
const JOURNEYS = [
  {
    id: "sleep", name: "Into Sleep", total: 45, fadeOut: true,
    blurb: "Calm focus easing down through stillness into delta sleep — then a slow fade to silence.",
    stops: ["Clear Mind", "Tide", "Stillness", "Deep Rest"],
  },
  {
    id: "focus", name: "Deep Focus", total: 50, fadeOut: false,
    blurb: "A bright, alert opening that settles into a long alpha plateau, with a gentle theta cool-down.",
    stops: ["Quickening", "Clear Mind", "Clear Mind", "Stillness"],
  },
  {
    id: "unwind", name: "Unwind", total: 25, fadeOut: false,
    blurb: "Let the day come down — the full orchestra at dusk dissolving into a drifting tide.",
    stops: ["Reverie", "Arcade Dusk", "Tide"],
  },
];
function easeInOut(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ---- endless drift: an open-ended journey that never stops ---------------
// Instead of a fixed list of stops, drift keeps choosing the *next* kindred
// scene and gliding to it, wandering forever among the calmer, blendable
// scenes. Reuses the journey transition model (glide CONT, snap STEP) per leg.
const DRIFT_POOL = ["Deep Rest", "Stillness", "Tide", "Reverie", "Clear Mind", "Inner Sun"];
const DRIFT_SEG_MIN = 165;  // seconds — shortest leg between scenes
const DRIFT_SEG_MAX = 285;  // seconds — longest leg
const EXPORT_OPTS = [1, 2, 3, 5];   // export lengths in minutes
function driftSegMs() { return (DRIFT_SEG_MIN + Math.random() * (DRIFT_SEG_MAX - DRIFT_SEG_MIN)) * 1000; }
// pick a neighbour within ±2 of the current pool index, never the same scene,
// so the wander meanders to related moods rather than jumping at random
function driftPick(i) {
  const L = DRIFT_POOL.length;
  const steps = [-2, -1, 1, 2];
  const s = steps[Math.floor(Math.random() * steps.length)];
  let j = i + s;
  if (j < 0 || j > L - 1) j = i - s;          // reflect off the ends
  j = Math.max(0, Math.min(L - 1, j));
  if (j === i) j = (i === 0) ? 1 : i - 1;
  return j;
}

const SLEEP_OPTS = [15, 30, 45, 60];
const SLEEP_FADE = 45; // seconds of gentle fade at the end

// sunrise wake — pick "in N minutes", music silences and waits, then a slow
// rise from inaudible to full. Mirror of the sleep timer, with the same chip UX.
const WAKE_OPTS = [30, 60, 240, 480];   // 30m nap → full night
const WAKE_RISE = 90;                    // seconds of rise from silence

// ---- meditation session: a timed sit framed by singing-bowl bells --------
const SESSION_OPTS = [5, 10, 15, 20, 30, 45];   // minutes
const INTERVAL_OPTS = [0, 3, 5, 10];             // interval-bell spacing, 0 = none
const SESSION_DUCK = 7;                          // seconds the field fades under the closing bells

// ---- time-of-day: pick a fitting scene on a fresh load --------------
// bright/open by day, reflective at the edges, quiet at night. Only used
// when there's no saved setup, so it never overrides a manual choice.
function sceneForHour(h) {
  if (h >= 5 && h < 9)   return "Stillness";    // dawn — gentle theta meditation
  if (h >= 9 && h < 14)  return "Clear Mind";   // morning — alpha calm focus
  if (h >= 14 && h < 18) return "Quickening";   // afternoon — bright, alert flow
  if (h >= 18 && h < 22) return "Reverie";      // evening — the full orchestra
  if (h >= 22 || h < 1)  return "Tide";         // night — drifting down
  return "Deep Rest";                           // 1–5 — delta, hushed
}
function partOfDay(h) {
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}
// a quiet, authored line for the first load — says *why* this scene, by the hour,
// so the opening feels chosen rather than random
function welcomeWhisper(h) {
  if (h >= 5 && h < 9)   return "Dawn is opening — a soft theta hum to wake into.";
  if (h >= 9 && h < 14)  return "Morning light — clear, unhurried tone to think inside.";
  if (h >= 14 && h < 18) return "Afternoon — bright glasswork to carry the day along.";
  if (h >= 18 && h < 22) return "Evening — the full orchestra, slowly re-voicing as the light goes.";
  if (h >= 22 || h < 1)  return "Late now — gentle tides to drift down on.";
  return "The small hours — hushed felt piano for the deepest rest.";
}
function defaultScene() {
  const name = sceneForHour(new Date().getHours());
  return SCENES.find((s) => s.name === name) || SCENES[0];
}

// ---- Media Session (lock-screen / background controls) ---------------
// A silent looping <audio> element anchors the page as an active media
// source, so the OS surfaces a now-playing card whose play/pause/next map
// onto the engine. The Web Audio output itself is untouched.
function makeSilentAudio() {
  const a = document.createElement("audio");
  a.loop = true;
  a.preload = "auto";
  a.setAttribute("playsinline", "");
  const sr = 8000, len = sr; // 1s of silence
  const buf = new ArrayBuffer(44 + len * 2);
  const dv = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); dv.setUint32(4, 36 + len * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true); ws(36, "data"); dv.setUint32(40, len * 2, true);
  a.src = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  return a;
}

// generated lock-screen artwork: concentric loops tinted to the current mood
const _artCache = {};
function makeArtwork(mood) {
  if (_artCache[mood]) return _artCache[mood];
  const pal = MOOD_VIZ[mood] || MOOD_VIZ.reflection;
  const sizes = [512, 256];
  const art = sizes.map((S) => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const bg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.7);
    bg.addColorStop(0, pal.bg[0]); bg.addColorStop(1, pal.bg[1]);
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    const rings = 5;
    for (let i = 1; i <= rings; i++) {
      g.beginPath();
      g.arc(0, 0, (S * 0.42) * (i / rings), 0, Math.PI * 2);
      g.strokeStyle = `rgba(${pal.ink},${0.1 + i * 0.03})`;
      g.lineWidth = S * 0.006; g.stroke();
    }
    // a few struck dots + one glowing accent — echoes the mandala
    g.fillStyle = `rgb(${pal.ink})`;
    [[0, -0.30], [0.26, 0.12], [-0.18, 0.24]].forEach(([x, y]) => {
      g.beginPath(); g.arc(x * S, y * S, S * 0.018, 0, Math.PI * 2); g.fill();
    });
    const glow = g.createRadialGradient(-S * 0.13, 0, 0, -S * 0.13, 0, S * 0.12);
    glow.addColorStop(0, `rgba(${pal.acc},0.95)`); glow.addColorStop(1, `rgba(${pal.acc},0)`);
    g.fillStyle = glow;
    g.beginPath(); g.arc(-S * 0.13, 0, S * 0.12, 0, Math.PI * 2); g.fill();
    return { src: c.toDataURL("image/png"), sizes: S + "x" + S, type: "image/png" };
  });
  _artCache[mood] = art;
  return art;
}

// ---- slider ----------------------------------------------------------
// built on a real <input type="range"> so it's fully keyboard-operable,
// screen-reader friendly, and has a generous touch target on mobile. The
// paper-ink look is layered on via CSS (track fill driven by --pct).
function Slider({ min, max, step, value, onChange, name, valuetext }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className="rng"
      min={min} max={max} step={step} value={value}
      aria-label={name}
      aria-valuetext={valuetext}
      onChange={(e) => onChange(+e.target.value)}
      style={{ "--pct": pct + "%" }}
    />
  );
}

// ---- one-line explanations for every dial in the Tune view ----------
// Plain language, short — the goal is to make a curious newcomer *understand*
// the instrument they're shaping, not to teach DSP. Lives on the dial as a
// tap-to-reveal whisper so the default view stays calm and uncluttered.
const DIAL_HINTS = {
  // motion
  "Density":   "How many loops play at once. More loops, lusher field.",
  "Tempo":     "How often each loop comes around to its note.",
  "Drift":     "How unequal the loops are. More drift, longer before they realign.",
  "Register":  "How high or low the music sits.",
  "Evolve":    "How much the field reshapes itself over time.",
  "Journey":   "Autonomous wander between related moods.",
  // space
  "Space":     "The size of the room the music plays in.",
  "Color":     "Brightness — dark and felt at one end, glassy at the other.",
  "Bloom":     "How much each note flowers out at its attack.",
  "Stutter":   "Random tape-stutters and dropouts.",
  // mixer
  "Master":    "Overall output level.",
  "Loops":     "How loud the generative music is.",
  "Ambience":  "Level of the background bed — rain, vinyl, wind, fire.",
  "Beat":      "Level of the binaural tones. Use headphones.",
  "Glue":      "Bonds the layers together. Higher, warmer and more cohesive.",
};

function Dial({ name, value, label, min, max, step, onChange }) {
  const [showHint, setShowHint] = useState(false);
  const hint = DIAL_HINTS[name];
  const wrapRef = useRef(null);
  // dismiss on outside click — keeps the tooltip from sticking around
  useEffect(() => {
    if (!showHint) return;
    const close = (e) => { if (!wrapRef.current || !wrapRef.current.contains(e.target)) setShowHint(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showHint]);
  return (
    <div className={"dial" + (showHint ? " hinted" : "")}>
      <div className="dial-head">
        <span className="dial-name">
          {name}
          {hint && (
            <span className="dial-info-wrap" ref={wrapRef}>
              <button className="dial-info" onClick={(e) => { e.stopPropagation(); setShowHint((v) => !v); }}
                aria-label={showHint ? "Hide hint" : "What is " + name + "?"}
                aria-expanded={showHint}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
                </svg>
              </button>
              {showHint && (
                <span className="dial-tooltip" role="tooltip">
                  {hint}
                  <span className="dial-tooltip-arrow" aria-hidden="true"></span>
                </span>
              )}
            </span>
          )}
        </span>
        <span className="dial-val">{label}</span>
      </div>
      <Slider name={name} valuetext={String(label)}
        min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}

// ---- main ------------------------------------------------------------
function App() {
  const saved = readConfig();
  const firstVisit = (() => {
    try { return !saved && !localStorage.getItem("loops.seen"); } catch (e) { return !saved; }
  })();
  // newcomers (no saved setup) land on a scene fitting the current time of day;
  // a manual setup (saved/URL) always wins and is never overridden. Computed
  // once (lazy) — `saved` flips truthy after the first persist, so recomputing
  // each render would wrongly revert this to SCENES[0].
  const [WELCOME] = useState(() => (saved ? SCENES[0] : defaultScene()));
  const [params, setParams] = useState(() => {
    const base = Object.assign({}, ENGINE.params, saved || {});
    if (!saved) Object.assign(base, WELCOME.p);
    return base;
  });
  const [showWelcome, setShowWelcome] = useState(firstVisit);
  const [welcomeHiding, setWelcomeHiding] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [families, setFamilies] = useState([]);
  // the mandala is the home: land in the Play view by default. The Tune route
  // (controls) is reached deliberately via the dock's "Sound" button.
  const [immersive, setImmersive] = useState(true);
  const [vizUiVisible, setVizUiVisible] = useState(true);
  const [sheet, setSheet] = useState(null); // play-view overlay: 'session' | 'journey' | 'info' | 'export' | null
  const [exportMin, setExportMin] = useState(2);    // chosen length in minutes
  const [exportState, setExportState] = useState("idle"); // idle | rendering | done | error
  const [exportPct, setExportPct] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { const v = localStorage.getItem("loops.volume"); return v != null ? +v : 0.85; } catch (e) { return 0.85; }
  });
  const [activeScene, setActiveScene] = useState(saved ? null : WELCOME.name);
  const [library, setLibrary] = useState(readLibrary);
  const [activeSaved, setActiveSaved] = useState(null);
  const [savedToast, setSavedToast] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [sleepDur, setSleepDur] = useState(0);     // minutes, 0 = off
  const [sleepEnd, setSleepEnd] = useState(0);     // timestamp ms, 0 = off
  const [sleepRemain, setSleepRemain] = useState(0);
  // ---- sunrise wake (mirror of sleep) ----
  const [wakeIn, setWakeIn] = useState(0);         // minutes selected, 0 = off
  const [wakeAt, setWakeAt] = useState(0);         // timestamp when rise *starts*
  const [wakeRising, setWakeRising] = useState(false);
  // ---- meditation session ----
  const [sessionPick, setSessionPick] = useState(() => {
    try { const v = localStorage.getItem("loops.session.dur"); return v != null ? +v : 10; } catch (e) { return 10; }
  });
  const [sessionInterval, setSessionInterval] = useState(() => {
    try { const v = localStorage.getItem("loops.session.interval"); return v != null ? +v : 0; } catch (e) { return 0; }
  });
  const [sessionEnd, setSessionEnd] = useState(0);     // timestamp ms, 0 = not running
  const [sessionRemain, setSessionRemain] = useState(0);
  const nextBellRef = useRef(0);
  const sessionEndingRef = useRef(false);
  const sessionTotalRef = useRef(0);
  // ---- journey (programmed scene arc) ----
  const [journey, setJourney] = useState(null);   // running journey def, or null
  const [journeyRemain, setJourneyRemain] = useState(0);
  const [journeyStop, setJourneyStop] = useState(0); // index of the stop we last reached
  const journeyEndRef = useRef(0);     // ms timestamp the journey completes
  const journeyStepRef = useRef(-1);   // highest stop index whose STEP keys are applied
  const journeyFadingRef = useRef(false);
  // ---- endless drift (open-ended journey) ----
  const [driftOn, setDriftOn] = useState(false);
  const [driftNow, setDriftNow] = useState("");
  const [driftNext, setDriftNext] = useState("");
  const [driftProgress, setDriftProgress] = useState(0);
  const driftActiveRef = useRef(false);
  const driftFromRef = useRef(null);
  const driftToRef = useRef(null);
  const driftSegStartRef = useRef(0);
  const driftSegDurRef = useRef(0);
  const sessionIntervalRef = useRef(sessionInterval);
  useEffect(() => {
    sessionIntervalRef.current = sessionInterval;
    try { localStorage.setItem("loops.session.interval", String(sessionInterval)); } catch (e) {}
    // if a session is live, re-aim the next interval bell from now
    if (sessionEnd && sessionInterval > 0) nextBellRef.current = Date.now() + sessionInterval * 60000;
    else if (!sessionInterval) nextBellRef.current = 0;
  }, [sessionInterval, sessionEnd]);
  useEffect(() => {
    try { localStorage.setItem("loops.session.dur", String(sessionPick)); } catch (e) {}
  }, [sessionPick]);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breathOn, setBreathOn] = useState(() => {
    try { return localStorage.getItem("loops.breath.on") === "1"; } catch (e) { return false; }
  });
  const [breathPat, setBreathPat] = useState(() => {
    try { return localStorage.getItem("loops.breath.pat") || "calm"; } catch (e) { return "calm"; }
  });
  const [section, setSection] = useState(() => {
    try { return localStorage.getItem("loops.section") || "scenes"; } catch (e) { return "scenes"; }
  });
  useEffect(() => {
    try { localStorage.setItem("loops.section", section); } catch (e) {}
  }, [section]);
  const hideTimerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const idleTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);
  const levRef = useRef({ level: 0, low: 0, high: 0 });
  const bellSeenRef = useRef(0);
  const bellPulseRef = useRef(null);
  const journeyPulseRef = useRef(null);
  const startedAtRef = useRef(0);
  const immersiveRef = useRef(false);
  const anchorRef = useRef(null);
  const breathRef = useRef(breathOn);
  const breathPatRef = useRef(breathPat);

  // keep the draw loop's breath refs + persistence in sync with state
  useEffect(() => {
    breathRef.current = breathOn;
    try { localStorage.setItem("loops.breath.on", breathOn ? "1" : "0"); } catch (e) {}
  }, [breathOn]);
  useEffect(() => {
    breathPatRef.current = breathPat;
    try { localStorage.setItem("loops.breath.pat", breathPat); } catch (e) {}
  }, [breathPat]);

  // push initial params into engine
  useEffect(() => { ENGINE.setParams(params); }, []); // eslint-disable-line
  useEffect(() => { persist(params); }, [params]);

  // listening volume -> engine master, persisted (kept out of the share URL)
  useEffect(() => {
    ENGINE.setVolume(volume);
    try { localStorage.setItem("loops.volume", String(volume)); } catch (e) {}
  }, [volume]);

  // sleep timer: count down, fade gently over the last SLEEP_FADE seconds,
  // then pause and reset the fade gain for the next session
  useEffect(() => {
    if (!sleepEnd) { setSleepRemain(0); return; }
    let fading = false;
    const tick = () => {
      const rem = Math.max(0, (sleepEnd - Date.now()) / 1000);
      setSleepRemain(rem);
      if (rem <= SLEEP_FADE && !fading) { fading = true; ENGINE.sleepFade(rem); }
      if (rem <= 0) {
        ENGINE.pause(); setPlaying(false); ENGINE.cancelFade();
        setSleepDur(0); setSleepEnd(0);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sleepEnd]);

  // wake timer: count down to wakeAt, then start the slow rise from silence.
  // After WAKE_RISE seconds the rise is complete and the timer clears itself.
  useEffect(() => {
    if (!wakeAt) return;
    let rising = false;
    const tick = () => {
      const now = Date.now();
      const remToRise = (wakeAt - now) / 1000;
      if (!rising && remToRise <= 0) {
        rising = true;
        setWakeRising(true);
        if (!ENGINE.playing) {
          ENGINE.play();
          startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
          setPlaying(true);
        }
        ENGINE.wakeFade(WAKE_RISE);
      }
      if (rising && remToRise <= -WAKE_RISE) {
        // rise complete — clear and let the music play on at full level
        setWakeIn(0); setWakeAt(0); setWakeRising(false);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [wakeAt, elapsed]);

  // session timer: count down, ring interval bells, and close with three slow
  // bells while the field ducks away. Runs independent of play/pause, so a
  // sitter can mute the music and keep just the bells over silence.
  useEffect(() => {
    if (!sessionEnd) { setSessionRemain(0); return; }
    const tick = () => {
      const now = Date.now();
      const rem = Math.max(0, (sessionEnd - now) / 1000);
      setSessionRemain(rem);
      // interval bell — but never within the last ~15s of the sit
      if (nextBellRef.current && sessionIntervalRef.current > 0 && now >= nextBellRef.current && rem > 15) {
        ENGINE.strikeBell({ octave: 1, vel: 0.78, decay: 7 });
        nextBellRef.current = now + sessionIntervalRef.current * 60000;
      }
      if (rem <= 0 && !sessionEndingRef.current) {
        sessionEndingRef.current = true;
        // three slow closing bells over a hush
        ENGINE.strikeBell({ vel: 1, decay: 12, delay: 0 });
        ENGINE.strikeBell({ vel: 0.92, decay: 12, delay: 3.4 });
        ENGINE.strikeBell({ vel: 0.86, decay: 13, delay: 6.8 });
        ENGINE.duckField(SESSION_DUCK);
        // once the field has faded under the bells, stop the scheduler (the
        // already-scheduled bells keep ringing — pause doesn't suspend audio)
        setTimeout(() => {
          ENGINE.pause(); setPlaying(false);
        }, (SESSION_DUCK + 2.5) * 1000);
        setSessionEnd(0);
        setSessionRemain(0);
        nextBellRef.current = 0;
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionEnd]);

  // journey engine: glide the continuous params between stops every tick, snap
  // the expensive ones at each waypoint (one crossfade), and run the chosen
  // end behaviour — a slow fade to silence (sleep) or simply arriving (focus).
  useEffect(() => {
    if (!journey) return;
    const stops = journey.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
    const N = stops.length;
    const totalSec = journey.total * 60;
    const segDur = totalSec / (N - 1);
    const FADE = 60; // seconds of wind-down for a sleep journey

    const tick = () => {
      const now = Date.now();
      const elapsedSec = totalSec - Math.max(0, (journeyEndRef.current - now) / 1000);
      const rem = Math.max(0, (journeyEndRef.current - now) / 1000);
      setJourneyRemain(rem);

      // snap STEP params for every waypoint we've passed (incl. the final one)
      const rawSeg = Math.min(N - 1, Math.floor(elapsedSec / segDur + 1e-6));
      while (journeyStepRef.current < rawSeg) {
        journeyStepRef.current += 1;
        const stop = stops[journeyStepRef.current];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        setParams((prev) => Object.assign({}, prev, stepObj));
        setJourneyStop(journeyStepRef.current);
        // mark the transition so the mandala pulses at the waypoint
        journeyPulseRef.current = { t0: ENGINE.ctx ? ENGINE.ctx.currentTime : 0 };
      }

      // glide CONT params across the current segment
      const cseg = Math.max(0, Math.min(N - 2, Math.floor(elapsedSec / segDur)));
      const f = easeInOut((elapsedSec - cseg * segDur) / segDur);
      const a = stops[cseg].p, b = stops[cseg + 1].p;
      const contObj = {};
      for (const k of JOURNEY_CONT_KEYS) {
        if (a[k] == null || b[k] == null) continue;
        const v = lerp(a[k], b[k], f);
        contObj[k] = v;
        ENGINE.set(k, v);
      }
      setParams((prev) => Object.assign({}, prev, contObj));

      // end behaviour
      if (journey.fadeOut) {
        if (rem <= FADE && !journeyFadingRef.current) {
          journeyFadingRef.current = true;
          ENGINE.sleepFade(rem);
        }
        if (rem <= 0) {
          ENGINE.pause(); setPlaying(false); ENGINE.cancelFade();
          cancelJourney({ silent: true });
        }
      } else if (rem <= 0) {
        // arrive and hand control back, leaving the final scene playing
        setActiveScene(journey.stops[N - 1]);
        cancelJourney({ silent: true });
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [journey, cancelJourney]);
  // keep the legend in sync with the instruments actually in play
  useEffect(() => {
    const seen = [];
    for (const v of ENGINE.voices) if (seen.indexOf(v.family) < 0) seen.push(v.family);
    setFamilies(seen);
  }, [params]);

  // visualization mode: tell the canvas loop which view to draw, and force a
  // resize so the canvas re-measures itself for full-screen (and back).
  useEffect(() => {
    immersiveRef.current = immersive;
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, [immersive]);

  // in viz mode the controls stay pinned until the first interaction, then
  // auto-hide when idle (and reappear on move); Escape returns to the main view.
  useEffect(() => {
    if (!immersive) { setVizUiVisible(true); return; }
    setVizUiVisible(true); // pinned on entry so Cast/Return are discoverable
    const arm = () => {
      setVizUiVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVizUiVisible(false), 3200);
    };
    const onKey = (e) => { if (e.key === "Escape") setImmersive(false); else arm(); };
    window.addEventListener("pointermove", arm);
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", arm);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", onKey);
      clearTimeout(hideTimerRef.current);
    };
  }, [immersive]);

  const update = useCallback((key, value) => {
    setParams((prev) => {
      const next = Object.assign({}, prev, { [key]: value });
      return next;
    });
    ENGINE.set(key, value);
    setActiveScene(null);
    setActiveSaved(null);
    cancelJourney();
    cancelDrift();
  }, []);

  const applyScene = useCallback((sc) => {
    cancelJourney();
    cancelDrift();
    setParams((prev) => Object.assign({}, prev, sc.p));
    ENGINE.setParams(Object.assign({}, ENGINE.params, sc.p));
    setActiveScene(sc.name);
    setActiveSaved(null);
  }, []);

  // ---- library actions ----
  // Keep the current field: snapshot every dial + the seed under a name you
  // can rename. This is the payoff for a reshuffle that lands somewhere lovely.
  const saveCurrent = useCallback(() => {
    const p = {};
    for (const k of KEYS) p[k] = params[k];
    const item = { id: uid(), name: activeScene || snapshotName(p), params: p, savedAt: Date.now() };
    setLibrary((prev) => {
      const next = [item, ...prev].slice(0, 24);
      writeLibrary(next);
      return next;
    });
    setActiveSaved(item.id);
    setSavedToast(true);
    clearTimeout(saveCurrent._t);
    saveCurrent._t = setTimeout(() => setSavedToast(false), 1900);
  }, [params, activeScene]);

  const recallSaved = useCallback((item) => {
    cancelJourney();
    cancelDrift();
    setParams((prev) => Object.assign({}, prev, item.params));
    ENGINE.setParams(Object.assign({}, ENGINE.params, item.params));
    setActiveScene(null);
    setActiveSaved(item.id);
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    }
  }, [elapsed]);

  const deleteSaved = useCallback((id) => {
    setLibrary((prev) => {
      const next = prev.filter((x) => x.id !== id);
      writeLibrary(next);
      return next;
    });
    setActiveSaved((cur) => (cur === id ? null : cur));
    setRenamingId((cur) => (cur === id ? null : cur));
  }, []);

  const renameSaved = useCallback((id, name) => {
    const clean = (name || "").trim();
    setLibrary((prev) => {
      const next = prev.map((x) => (x.id === id && clean) ? Object.assign({}, x, { name: clean }) : x);
      writeLibrary(next);
      return next;
    });
    setRenamingId(null);
  }, []);

  // step through the curated scenes (used by lock-screen next/prev)
  const cycleScene = useCallback((dir) => {
    cancelJourney();
    cancelDrift();
    setActiveScene((cur) => {
      let idx = SCENES.findIndex((s) => s.name === cur);
      idx = idx < 0 ? (dir > 0 ? 0 : SCENES.length - 1)
                    : (idx + dir + SCENES.length) % SCENES.length;
      const sc = SCENES[idx];
      setParams((prev) => Object.assign({}, prev, sc.p));
      ENGINE.setParams(Object.assign({}, ENGINE.params, sc.p));
      return sc.name;
    });
    setActiveSaved(null);
  }, []);

  // toggle an ambience layer on/off (multiple may run at once)
  const toggleTexture = useCallback((id) => {
    setParams((prev) => {
      const cur = (prev.texture || "").split(".").filter(Boolean);
      const i = cur.indexOf(id);
      if (i < 0) cur.push(id); else cur.splice(i, 1);
      const str = cur.join(".");
      ENGINE.set("texture", str);
      return Object.assign({}, prev, { texture: str });
    });
  }, []);

  const reshuffle = useCallback(() => {
    const seed = Math.floor(Math.random() * 99999) + 1;
    update("seed", seed);
  }, [update]);

  const toggle = useCallback(() => {
    if (ENGINE.playing) {
      ENGINE.pause(); setPlaying(false);
      ENGINE.cancelFade(); setSleepDur(0); setSleepEnd(0);
    } else {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    }
  }, [elapsed]);

  // pick a sleep duration (minutes); 0 cancels. Starts playback if idle.
  const setSleep = useCallback((min) => {
    if (!min) { ENGINE.cancelFade(); setSleepDur(0); setSleepEnd(0); return; }
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    }
    ENGINE.cancelFade();
    setSleepDur(min);
    setSleepEnd(Date.now() + min * 60000);
  }, [elapsed]);

  // ---- sunrise wake -------------------------------------------------
  // pick a "wake in N min" and the music hushes — playback continues but the
  // fade gain drops to inaudible. When the wake time arrives, the music rises
  // back to full over WAKE_RISE seconds. The mandala brightens with it (its
  // glow is audio-reactive), so the room lights up at dawn. Mirror of sleep.
  const setWake = useCallback((min) => {
    if (!min) {
      setWakeIn(0); setWakeAt(0); setWakeRising(false);
      ENGINE.cancelFade();
      return;
    }
    // any other timed thing would fight over the fade gain — cancel them all
    setSleepDur(0); setSleepEnd(0);
    setSessionEnd(0); setSessionRemain(0); sessionEndingRef.current = false;
    if (journeyEndRef.current) {
      journeyEndRef.current = 0; journeyStepRef.current = -1; journeyFadingRef.current = false;
      setJourney(null); setJourneyRemain(0); setJourneyStop(0);
    }
    driftActiveRef.current = false; setDriftOn(false);
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    }
    ENGINE.silenceFade();
    setWakeIn(min);
    setWakeAt(Date.now() + min * 60000);
    setWakeRising(false);
  }, [elapsed]);

  // ---- meditation session --------------------------------------------
  // a timed sit opened by a singing-bowl bell, optionally punctuated by
  // interval bells, and closed by three slow bells as the field fades away.
  const beginSession = useCallback((min) => {
    if (!min) return;
    // a session and the sleep timer would fight over the fade — cancel sleep
    ENGINE.cancelFade(); setSleepDur(0); setSleepEnd(0);
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    } else {
      // recover the field in case a previous close left it ducked
      ENGINE.setLoopLevel(ENGINE.params.looplevel);
      ENGINE.setTextureLevel(ENGINE.params.texlevel);
    }
    sessionEndingRef.current = false;
    ENGINE.strikeBell({ vel: 1, decay: 11 });           // opening bell
    const now = Date.now();
    nextBellRef.current = sessionIntervalRef.current > 0 ? now + sessionIntervalRef.current * 60000 : 0;
    sessionTotalRef.current = min * 60;
    setSessionRemain(min * 60);
    setSessionEnd(now + min * 60000);
  }, [elapsed]);

  // stop early: a single soft bell, no closing sequence, music keeps playing
  const endSession = useCallback(() => {
    sessionEndingRef.current = false;
    nextBellRef.current = 0;
    setSessionEnd(0);
    setSessionRemain(0);
  }, []);

  // ---- journey: a programmed arc between scenes -----------------------
  const cancelJourney = useCallback((opts) => {
    opts = opts || {};
    if (!journeyEndRef.current) return; // nothing running — don't touch the fade
    journeyEndRef.current = 0;
    journeyStepRef.current = -1;
    journeyFadingRef.current = false;
    if (opts.silent !== true) ENGINE.cancelFade();
    setJourney(null);
    setJourneyRemain(0);
    setJourneyStop(0);
  }, []);

  const beginJourney = useCallback((j) => {
    if (!j) return;
    cancelDrift();
    const stops = j.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
    if (stops.length < 2) return;
    // clear anything else that owns the fade / transport program
    ENGINE.cancelFade();
    setSleepDur(0); setSleepEnd(0);
    setSessionEnd(0); setSessionRemain(0); sessionEndingRef.current = false;

    // land fully on the first stop, with autonomous wander off so the
    // programmed arc isn't fighting the engine's own journey drift
    const first = Object.assign({}, stops[0].p, { journey: 0 });
    setParams((prev) => Object.assign({}, prev, first));
    if (!ENGINE.playing) {
      ENGINE.setParams(Object.assign({}, ENGINE.params, first));
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    } else {
      ENGINE.setParams(Object.assign({}, ENGINE.params, first));
    }
    setActiveScene(null);
    setActiveSaved(null);
    journeyStepRef.current = 0;
    journeyFadingRef.current = false;
    journeyEndRef.current = Date.now() + j.total * 60000;
    setJourney(j);
    setJourneyStop(0);
    setJourneyRemain(j.total * 60);
  }, [elapsed]);

  // ---- endless drift -------------------------------------------------
  const cancelDrift = useCallback(() => {
    if (!driftActiveRef.current) return;
    driftActiveRef.current = false;
    setDriftOn(false);
    setDriftNow(""); setDriftNext(""); setDriftProgress(0);
  }, []);

  const beginDrift = useCallback(() => {
    // clear anything else that owns the transport program / fade
    ENGINE.cancelFade();
    setSleepDur(0); setSleepEnd(0);
    setSessionEnd(0); setSessionRemain(0); sessionEndingRef.current = false;
    if (journeyEndRef.current) {           // stop a fixed journey if running
      journeyEndRef.current = 0; journeyStepRef.current = -1; journeyFadingRef.current = false;
      setJourney(null); setJourneyRemain(0); setJourneyStop(0);
    }
    // start from the current scene if it's in the pool, else a random one
    let idx = DRIFT_POOL.indexOf(activeScene);
    if (idx < 0) idx = Math.floor(Math.random() * DRIFT_POOL.length);
    const fromName = DRIFT_POOL[idx];
    const first = Object.assign({}, SCENE_BY_NAME[fromName].p, { journey: 0 });
    setParams((prev) => Object.assign({}, prev, first));
    if (!ENGINE.playing) {
      ENGINE.setParams(Object.assign({}, ENGINE.params, first));
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    } else {
      ENGINE.setParams(Object.assign({}, ENGINE.params, first));
    }
    setActiveScene(null);
    setActiveSaved(null);
    const toIdx = driftPick(idx);
    driftFromRef.current = fromName;
    driftToRef.current = DRIFT_POOL[toIdx];
    driftSegStartRef.current = Date.now();
    driftSegDurRef.current = driftSegMs();
    driftActiveRef.current = true;
    setDriftNow(fromName);
    setDriftNext(DRIFT_POOL[toIdx]);
    setDriftProgress(0);
    setDriftOn(true);
  }, [elapsed, activeScene]);

  // ---- export: render the current drift to a downloadable WAV --------
  const doExport = useCallback((minutes) => {
    setExportState((cur) => {
      if (cur === "rendering") return cur;
      return "rendering";
    });
    setExportPct(0);
    let p = 0;
    const ticker = setInterval(() => { p = Math.min(0.92, p + 0.04 + Math.random() * 0.05); setExportPct(p); }, 220);
    const sceneLabel = activeScene || activeSaved || ENGINE.params.ensemble;
    // yield a frame so the "rendering" UI paints before the (heavy) synchronous
    // scheduling that precedes startRendering
    setTimeout(() => {
      ENGINE.renderOffline({ seconds: minutes * 60, params: ENGINE.params })
        .then((buf) => {
          // peak-normalise to a healthy, consistent level (~ -1 dBFS) so every
          // export lands at a good volume regardless of how quiet the scene is
          let peak = 0;
          for (let c = 0; c < buf.numberOfChannels; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
          }
          if (peak > 0) {
            const g = Math.min(8, 0.89 / peak);
            for (let c = 0; c < buf.numberOfChannels; c++) {
              const d = buf.getChannelData(c);
              for (let i = 0; i < d.length; i++) d[i] *= g;
            }
          }
          const blob = AmbientEngine.bufferToWav(buf);
          const safe = String(sceneLabel || "drift").replace(/[^\w\s-]/g, "").trim() || "drift";
          const fname = "Loops - " + safe + " (" + minutes + "m).wav";
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = fname;
          document.body.appendChild(a); a.click();
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
          clearInterval(ticker);
          setExportPct(1);
          setExportState("done");
        })
        .catch(() => {
          clearInterval(ticker);
          setExportState("error");
        });
    }, 60);
  }, [activeScene, activeSaved]);

  // drift tick: glide CONT params toward the next scene; at each leg's end,
  // snap the new scene's STEP params and choose the next kindred destination.
  useEffect(() => {
    if (!driftOn) return;
    const tick = () => {
      const now = Date.now();
      let f = (now - driftSegStartRef.current) / driftSegDurRef.current;
      if (f >= 1) {
        // arrive at `to`: snap its expensive params (a single crossfade)
        const toName = driftToRef.current;
        const toIdx = DRIFT_POOL.indexOf(toName);
        const stop = SCENE_BY_NAME[toName];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        setParams((prev) => Object.assign({}, prev, stepObj));
        // choose the next leg
        const nIdx = driftPick(toIdx);
        driftFromRef.current = toName;
        driftToRef.current = DRIFT_POOL[nIdx];
        driftSegStartRef.current = now;
        driftSegDurRef.current = driftSegMs();
        setDriftNow(toName);
        setDriftNext(DRIFT_POOL[nIdx]);
        journeyPulseRef.current = { t0: ENGINE.ctx ? ENGINE.ctx.currentTime : 0 };
        f = 0;
      }
      setDriftProgress(f);
      const a = SCENE_BY_NAME[driftFromRef.current].p;
      const b = SCENE_BY_NAME[driftToRef.current].p;
      const e = easeInOut(f);
      const contObj = {};
      for (const k of JOURNEY_CONT_KEYS) {
        if (a[k] == null || b[k] == null) continue;
        const v = lerp(a[k], b[k], e);
        contObj[k] = v;
        ENGINE.set(k, v);
      }
      setParams((prev) => Object.assign({}, prev, contObj));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [driftOn]);

  // enter the immersive mandala and fill the screen in one gesture
  const enterViz = useCallback(() => {
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    }
    setImmersive(true);
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      const r = el.requestFullscreen();
      if (r && r.catch) r.catch(() => {});
    }
  }, [elapsed]);

  // first-listen: start the curated welcome scene and slip into the mandala
  const begin = useCallback(() => {
    try { localStorage.setItem("loops.seen", "1"); } catch (e) {}
    ENGINE.play();
    startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0);
    setPlaying(true);
    setImmersive(true);
    setWelcomeHiding(true);
    setTimeout(() => setShowWelcome(false), 950);
  }, []);

  // true browser fullscreen toggle (used inside the immersive bar)
  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      const r = el.requestFullscreen && el.requestFullscreen();
      if (r && r.catch) r.catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const share = useCallback(() => {
    const url = location.href;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
    else done();
  }, []);

  // sync React state when Journey autonomously changes the field
  useEffect(() => {
    ENGINE.onJourney = (info) => {
      setParams((prev) => Object.assign({}, prev, {
        mood: info.mood, color: info.color, register: info.register,
      }));
      setActiveScene(null);
      setActiveSaved(null);
    };
    return () => { ENGINE.onJourney = null; };
  }, []);

  // keep the screen awake while playing (casting / long listens / screensaver)
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      if (!("wakeLock" in navigator) || !playing) return;
      try {
        const wl = await navigator.wakeLock.request("screen");
        if (cancelled) { wl.release().catch(() => {}); return; }
        wakeLockRef.current = wl;
        wl.addEventListener("release", () => { if (wakeLockRef.current === wl) wakeLockRef.current = null; });
      } catch (e) {}
    };
    const onVis = () => { if (document.visibilityState === "visible" && playing && !wakeLockRef.current) acquire(); };
    if (playing) acquire();
    else if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; }
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); };
  }, [playing]);

  // mirror real browser-fullscreen state (Esc / F11 can change it underneath us)
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // leaving the mandala should also release browser fullscreen
  useEffect(() => {
    if (!immersive && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [immersive]);

  // screensaver: after a long idle while playing on the main view, drift into
  // the mandala on its own (no gesture, so CSS-immersive rather than true FS)
  useEffect(() => {
    if (!playing || immersive || showWelcome) return;
    const SS = 90000;
    const arm = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => { if (ENGINE.playing) setImmersive(true); }, SS);
    };
    arm();
    window.addEventListener("pointermove", arm);
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointermove", arm);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [playing, immersive, showWelcome]);

  // PWA install: capture the deferred prompt so we can offer "Install"
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(() => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.finally(() => setInstallPrompt(null));
  }, [installPrompt]);

  // ---- Media Session: lock-screen / background transport --------------
  // start/stop the silent anchor with playback and reflect the state
  useEffect(() => {
    if (!anchorRef.current) anchorRef.current = makeSilentAudio();
    const a = anchorRef.current;
    if (playing) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
    else a.pause();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [playing]);

  // register transport handlers once (play/pause/stop + scene skip)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (k, fn) => { try { ms.setActionHandler(k, fn); } catch (e) {} };
    set("play", () => { if (!ENGINE.playing) toggle(); });
    set("pause", () => { if (ENGINE.playing) toggle(); });
    set("stop", () => { if (ENGINE.playing) toggle(); });
    set("nexttrack", () => cycleScene(1));
    set("previoustrack", () => cycleScene(-1));
    return () => ["play", "pause", "stop", "nexttrack", "previoustrack"].forEach((k) => set(k, null));
  }, [toggle, cycleScene]);

  // keep the now-playing metadata in sync with the current texture
  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
    const mName = AmbientEngine.MOODS[params.mood] ? AmbientEngine.MOODS[params.mood].name : "Drift";
    const eName = AmbientEngine.ENSEMBLES[params.ensemble] ? AmbientEngine.ENSEMBLES[params.ensemble].name : "";
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: activeScene || mName,
        artist: "Loops — generative ambient",
        album: eName + (eName && mName ? " · " : "") + mName,
        artwork: makeArtwork(params.mood),
      });
    } catch (e) {}
  }, [activeScene, params.mood, params.ensemble]);

  // ---- animation loop ----
  useEffect(() => {
    let raf;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: r.height };
    }
    let dim = resize();
    const onResize = () => { dim = resize(); };
    window.addEventListener("resize", onResize);

    const PAD_T = 24, PAD_B = 22;
    const INK = "44,39,31";
    const ACC = "176,97,58";

    function emitRipple(x, y, max, str, delay) {
      ripplesRef.current.push({ x: x, y: y, t0: (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) + (delay || 0), max: max, str: str });
    }
    function drawRipples(audioNow, accTuple) {
      const acc = accTuple || ACC;
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const age = audioNow - rp.t0;
        const life = 3.4;
        if (age > life) { ripples.splice(i, 1); continue; }
        if (age < 0) continue;
        const k = age / life;
        const rad = 8 + k * rp.max;
        const a = (1 - k) * 0.16 * rp.str;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${acc},${a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // progress + wrap detection, independent of which view is showing.
    // when paused, voices still drift on a wall clock (idle "preview" motion)
    // so the instrument always looks alive — but without strikes or audio.
    function updateProgress(audioNow) {
      const voices = ENGINE.voices;
      const playing = ENGINE.playing;
      const wall = performance.now() / 1000;
      for (const v of voices) {
        let prog;
        if (playing) {
          prog = ENGINE.progress(v);
          v.viz.justWrapped = prog < v.viz.prev - 0.4;
          if (v.viz.justWrapped) { v.viz.strike = audioNow; v.viz.fx = v.viz.nextFx; }
        } else {
          if (v._pv == null) v._pv = (v.viz.prev != null ? v.viz.prev : Math.random());
          prog = (((v._pv + wall / v.period) % 1) + 1) % 1;
          v.viz.justWrapped = false;
        }
        v.viz.prog = prog;
        v.viz.prev = prog;
      }
    }

    function draw() {
      const { w, h } = dim;
      ctx.clearRect(0, 0, w, h);
      // a clock that keeps advancing whether or not audio is playing, so the
      // mandala's spin/breath animate during the idle preview too
      const audioNow = ENGINE.ctx ? ENGINE.ctx.currentTime : performance.now() / 1000;
      // sample the live output so visuals react to the actual sound
      const lv = ENGINE.playing ? ENGINE.sampleLevels() : { level: 0, low: 0, high: 0 };
      levRef.current = lv;
      // detect a fresh bell strike and ring the whole field from the centre
      if (ENGINE.bellSeq !== bellSeenRef.current) {
        bellSeenRef.current = ENGINE.bellSeq;
        bellPulseRef.current = { t0: ENGINE.lastBell || audioNow, vel: ENGINE.lastBellVel || 1 };
      }
      if (startedAtRef.current && ENGINE.playing) setElapsedThrottled(audioNow - startedAtRef.current);
      updateProgress(audioNow);
      if (immersiveRef.current) drawMandala(w, h, audioNow);
      else drawPanel(w, h, audioNow);
      raf = requestAnimationFrame(draw);
    }

    // ---- panel view: stacked bars + stereo drift ----
    function drawPanel(w, h, audioNow) {
      const narrow = w < 540;
      const PAD_L = narrow ? 46 : 78;
      const PAD_R = narrow ? 16 : 54;
      const STEREO_H = narrow ? 70 : 88;
      const voices = ENGINE.voices;
      const areaW = w - PAD_L - PAD_R;
      const n = voices.length;
      const barsH = h - PAD_T - PAD_B - STEREO_H;
      const rowH = n ? barsH / n : 0;
      let maxP = 1;
      for (const v of voices) if (v.period > maxP) maxP = v.period;

      drawRipples(audioNow);

      for (let i = 0; i < n; i++) {
        const v = voices[i];
        const y = PAD_T + rowH * (i + 0.5);
        const barLen = Math.max(46, (v.period / maxP) * areaW);
        const x0 = PAD_L;
        const x1 = x0 + barLen;
        const prog = v.viz.prog;

        if (v.viz.justWrapped) {
          const isStutter = v.viz.fx === "stutter";
          emitRipple(x0, y, 70 + (1 - (v.midi - 40) / 44) * 90, (0.7 + Math.random() * 0.5) * (isStutter ? 1.3 : 1));
          if (isStutter) {
            const bursts = 3 + Math.floor(Math.random() * 3);
            for (let s = 1; s <= bursts; s++) emitRipple(x0, y, 34, 0.5, s * 0.06);
          }
        }

        const px = x0 + prog * barLen;

        ctx.beginPath();
        ctx.moveTo(x0, y); ctx.lineTo(x1, y);
        ctx.strokeStyle = `rgba(${INK},0.18)`;
        ctx.lineWidth = 1; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4);
        ctx.strokeStyle = `rgba(${INK},0.28)`; ctx.stroke();

        const grad = ctx.createLinearGradient(x0, 0, px, 0);
        grad.addColorStop(0, `rgba(${ACC},0.04)`);
        grad.addColorStop(1, `rgba(${ACC},0.5)`);
        ctx.beginPath();
        ctx.moveTo(x0, y); ctx.lineTo(px, y);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.6; ctx.stroke();

        const since = audioNow - v.viz.strike;
        let dotR = 3.1;
        if (since >= 0 && since < 2.2) {
          const e = since / 2.2;
          const bloomR = 4 + (1 - e) * 16;
          const ba = (1 - e) * 0.5;
          const rg = ctx.createRadialGradient(x0, y, 0, x0, y, bloomR);
          rg.addColorStop(0, `rgba(${ACC},${ba})`);
          rg.addColorStop(1, `rgba(${ACC},0)`);
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(x0, y, bloomR, 0, Math.PI * 2); ctx.fill();
          dotR = 3.1 + (1 - e) * 2.4;
        }
        if (v.viz.fx === "stutter" && since >= 0 && since < 0.9) {
          const e = since / 0.9;
          ctx.strokeStyle = `rgba(${ACC},${(1 - e) * 0.8})`;
          ctx.lineWidth = 1;
          for (let s = 0; s < 5; s++) {
            const sx = x0 + 5 + s * 4.5;
            const hh = 2.5 + (4 - s) * 0.8;
            ctx.beginPath(); ctx.moveTo(sx, y - hh); ctx.lineTo(sx, y + hh); ctx.stroke();
          }
        }

        drawGlyph(ctx, v.family, x0, y, dotR, `rgba(${INK},0.92)`);

        ctx.beginPath();
        ctx.arc(px, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACC},0.95)`; ctx.fill();

        ctx.font = (narrow ? "10px" : "11px") + " 'IBM Plex Mono', monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${INK},0.85)`;
        ctx.fillText(v.name, PAD_L - (narrow ? 9 : 16), y);
        if (!narrow) {
          ctx.textAlign = "left";
          ctx.fillStyle = `rgba(${INK},0.4)`;
          ctx.font = "9.5px 'IBM Plex Mono', monospace";
          ctx.fillText(v.period.toFixed(1) + "s", x1 + 8, y);
        }
      }

      // stereo drift plot
      const sTop = h - PAD_B - STEREO_H + 14;
      const sBot = h - PAD_B - 16;
      const axisY = (sTop + sBot) / 2;
      const sx0 = PAD_L, sx1 = w - PAD_R;
      const scx = (sx0 + sx1) / 2;
      const half = (sx1 - sx0) / 2;

      ctx.beginPath();
      ctx.moveTo(sx0, sTop - 10); ctx.lineTo(sx1, sTop - 10);
      ctx.strokeStyle = `rgba(${INK},0.10)`; ctx.lineWidth = 1; ctx.stroke();

      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(scx, sTop); ctx.lineTo(scx, sBot);
      ctx.strokeStyle = `rgba(${INK},0.14)`; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sx0, axisY); ctx.lineTo(sx1, axisY);
      ctx.strokeStyle = `rgba(${INK},0.10)`; ctx.stroke();

      ctx.font = "9.5px 'IBM Plex Mono', monospace";
      ctx.fillStyle = `rgba(${INK},0.4)`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left"; ctx.fillText("STEREO DRIFT", sx0, sTop - 22);
      ctx.textAlign = "left"; ctx.fillText("L", sx0, axisY);
      ctx.textAlign = "right"; ctx.fillText("R", sx1, axisY);

      for (let i = 0; i < n; i++) {
        const v = voices[i];
        const pan = ENGINE.ctx ? ENGINE.panAt(v, audioNow) : v.panBase;
        const dx = scx + pan * half;
        const dy = n > 1 ? sTop + 6 + (i / (n - 1)) * (sBot - sTop - 12) : axisY;
        const since = audioNow - v.viz.strike;
        const lit = ENGINE.playing && since >= 0 && since < 1.6;
        const e = lit ? since / 1.6 : 1;

        ctx.beginPath(); ctx.moveTo(scx, dy); ctx.lineTo(dx, dy);
        ctx.strokeStyle = `rgba(${INK},${lit ? 0.18 + (1 - e) * 0.25 : 0.12})`;
        ctx.lineWidth = 1; ctx.stroke();

        if (lit) {
          const gr = 3 + (1 - e) * 9;
          const rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, gr);
          rg.addColorStop(0, `rgba(${ACC},${(1 - e) * 0.45})`);
          rg.addColorStop(1, `rgba(${ACC},0)`);
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(dx, dy, gr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(dx, dy, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = lit ? `rgba(${ACC},0.95)` : `rgba(${INK},0.5)`;
        ctx.fill();
      }
    }

    // ---- immersive view: orbital mandala ----
    // each loop is a hand of its own length, revolving once per loop period
    // (shortest = innermost & fastest), striking as it crosses the top.
    // threads light up between loops whose hands momentarily align.
    // colour follows mood; tempo drives a slow global spin; space widens the
    // glow; density sets the ring count; color brightens the whole field.
    function drawMandala(w, h, audioNow) {
      const voices = ENGINE.voices;
      const n = voices.length;
      const cx = w / 2, cy = h / 2;
      const minDim = Math.min(w, h);

      const pal = MOOD_VIZ[ENGINE.params.mood] || MOOD_VIZ.reflection;
      const INKv = pal.ink, ACCv = pal.acc;
      const space = ENGINE.params.space;
      const colr = ENGINE.params.color;
      const tempo = ENGINE.params.tempo;
      const haloK = 0.7 + space * 0.95;     // reverb -> larger blooms / ripples
      // live output level drives a gentle, real-time swell of the whole field
      const lev = (levRef.current && levRef.current.level) || 0;
      const levLow = (levRef.current && levRef.current.low) || 0;
      const levHigh = (levRef.current && levRef.current.high) || 0;
      const glow = 0.55 + colr * 0.5 + (ENGINE.params.bloom || 0) * 0.22 + lev * 0.5; // color + bloom + live loudness -> luminance

      // deep, mood-tinted background wash
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.78);
      bg.addColorStop(0, pal.bg[0]);
      bg.addColorStop(1, pal.bg[1]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // gentle breathing + a very slow rotation (eased faster by tempo).
      // low-frequency energy adds a subtle real-time swell on top of the breath.
      const breath = 1 + Math.sin(audioNow * 0.13) * 0.03 + levLow * 0.04;
      const spin = audioNow * (0.010 + tempo * 0.024);
      const rMax = minDim * (n > 8 ? 0.42 : 0.38) * breath;
      const rMin = minDim * 0.10 * breath;

      for (let i = 0; i < n; i++) {
        const v = voices[i];
        const t = n > 1 ? i / (n - 1) : 0.5;
        const R = rMin + t * (rMax - rMin);
        const ang = -Math.PI / 2 + spin + v.viz.prog * Math.PI * 2;
        v.viz.R = R; v.viz.ang = ang;
        v.viz.mx = cx + Math.cos(ang) * R;
        v.viz.my = cy + Math.sin(ang) * R;
        if (v.viz.justWrapped) {
          const isStutter = v.viz.fx === "stutter";
          emitRipple(v.viz.mx, v.viz.my, (60 + (1 - (v.midi - 40) / 44) * 80) * haloK, (0.7 + Math.random() * 0.4) * (isStutter ? 1.3 : 1));
          if (isStutter) {
            const b = 3 + Math.floor(Math.random() * 3);
            for (let s = 1; s <= b; s++) emitRipple(v.viz.mx, v.viz.my, 30 * haloK, 0.5, s * 0.06);
          }
        }
      }

      // orbit rings
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, voices[i].viz.R, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${INKv},0.08)`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      drawRipples(audioNow, ACCv);

      // alignment threads (the happy accidents)
      const TH = 0.30;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let d = Math.abs(voices[i].viz.ang - voices[j].viz.ang) % (Math.PI * 2);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d < TH) {
            const al = (1 - d / TH) * 0.26 * glow;
            ctx.beginPath();
            ctx.moveTo(voices[i].viz.mx, voices[i].viz.my);
            ctx.lineTo(voices[j].viz.mx, voices[j].viz.my);
            ctx.strokeStyle = `rgba(${ACCv},${al})`;
            ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }

      // hands, trails, blooms, dots
      for (let i = 0; i < n; i++) {
        const v = voices[i];
        const hg = ctx.createLinearGradient(cx, cy, v.viz.mx, v.viz.my);
        hg.addColorStop(0, `rgba(${INKv},0.02)`);
        hg.addColorStop(1, `rgba(${INKv},0.17)`);
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(v.viz.mx, v.viz.my);
        ctx.strokeStyle = hg; ctx.lineWidth = 1; ctx.stroke();

        // trailing arc behind the hand
        ctx.beginPath();
        ctx.arc(cx, cy, v.viz.R, v.viz.ang - 0.1 * Math.PI * 2, v.viz.ang);
        ctx.strokeStyle = `rgba(${ACCv},${0.34 * glow})`;
        ctx.lineWidth = 1.6; ctx.stroke();

        const since = audioNow - v.viz.strike;
        let dotR = 3.2;
        if (since >= 0 && since < 2.4) {
          const e = since / 2.4;
          const bR = (4 + (1 - e) * 22) * haloK;
          const ba = (1 - e) * 0.55 * glow;
          const rg = ctx.createRadialGradient(v.viz.mx, v.viz.my, 0, v.viz.mx, v.viz.my, bR);
          rg.addColorStop(0, `rgba(${ACCv},${ba})`);
          rg.addColorStop(1, `rgba(${ACCv},0)`);
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(v.viz.mx, v.viz.my, bR, 0, Math.PI * 2); ctx.fill();
          dotR = 3.2 + (1 - e) * 2.8;
        }
        drawGlyph(ctx, v.family, v.viz.mx, v.viz.my, dotR, `rgba(${INKv},0.92)`);
      }

      // centre: a soft glow that breathes with the actual output level — louder
      // passages bloom the core, quiet ones let it settle. Suppressed when the
      // breath guide is on so its pacing pulse doesn't compete.
      if (!breathRef.current) {
        const idle = 0.5 + 0.5 * Math.sin(audioNow * 0.45);
        // blend a slow idle shimmer with the live loudness so it's alive even when quiet
        const drive = 0.35 * idle + 0.9 * lev;
        const cR = (9 + drive * 30) * haloK;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
        cg.addColorStop(0, `rgba(${ACCv},${(0.18 + lev * 0.4) * glow})`);
        cg.addColorStop(1, `rgba(${ACCv},0)`);
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.fill();
      }
      // (no solid centre dot here: it would show through the gap of the pause
      // glyph and read as an "H". The radial glow above carries the live level.)

      // ---- bell strikes ring the whole field ----
      // a struck singing bowl sends slow concentric waves out from the centre,
      // so a session's opening / interval / closing bells are *seen* as well as heard.
      if (bellPulseRef.current) {
        const bp = bellPulseRef.current;
        const age = audioNow - bp.t0;
        const life = 4.2;
        if (age > life) { bellPulseRef.current = null; }
        else if (age >= 0) {
          const reach = minDim * 0.52;
          for (let wv = 0; wv < 3; wv++) {
            const wAge = age - wv * 0.55;
            if (wAge < 0) continue;
            const k = wAge / life;
            if (k > 1) continue;
            const rad = 6 + k * reach;
            const a = (1 - k) * (1 - k) * 0.5 * bp.vel;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${ACCv},${a})`;
            ctx.lineWidth = 2 - k * 1.4;
            ctx.stroke();
          }
          // a brief central flare on the strike
          if (age < 1.2) {
            const fk = 1 - age / 1.2;
            const fR = (14 + fk * 34) * haloK;
            const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fR);
            fg.addColorStop(0, `rgba(${ACCv},${fk * 0.5 * bp.vel})`);
            fg.addColorStop(1, `rgba(${ACCv},0)`);
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(cx, cy, fR, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // ---- journey waypoint pulse ----
      // when a journey crosses into a new scene, a soft expanding ring marks
      // the transition out near the orbit edge.
      if (journeyPulseRef.current) {
        const jp = journeyPulseRef.current;
        const age = audioNow - jp.t0;
        const life = 3.6;
        if (age > life) { journeyPulseRef.current = null; }
        else if (age >= 0) {
          const k = age / life;
          const rad = rMax * (0.5 + k * 0.8);
          const a = (1 - k) * 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ACCv},${a})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // ---- breath synchronization guide ----
      // a soft ring grows on the inhale, holds, and settles on the exhale; a
      // faint phase word + count let a meditator pace their breath to it.
      if (breathRef.current) {
        const pat = BREATH_PATTERNS[breathPatRef.current] || BREATH_PATTERNS.calm;
        let pos = audioNow % pat.total;
        let phase = pat.seq[0], local = 0;
        for (let k = 0; k < pat.seq.length; k++) {
          if (pos < pat.seq[k].d) { phase = pat.seq[k]; local = pos / pat.seq[k].d; break; }
          pos -= pat.seq[k].d;
        }
        // eased lung-fullness 0..1 for this moment
        const ease = phase.s0 === phase.s1
          ? phase.s0
          : phase.s0 + (phase.s1 - phase.s0) * (0.5 - 0.5 * Math.cos(local * Math.PI));
        const rB = minDim * (0.05 + ease * 0.28);

        // soft filled orb
        const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, rB);
        og.addColorStop(0, `rgba(${ACCv},${(0.06 + ease * 0.16) * glow})`);
        og.addColorStop(0.72, `rgba(${ACCv},${(0.02 + ease * 0.06) * glow})`);
        og.addColorStop(1, `rgba(${ACCv},0)`);
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI * 2); ctx.fill();

        // the crisp ring to follow
        ctx.beginPath(); ctx.arc(cx, cy, rB, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ACCv},${0.3 + ease * 0.3})`;
        ctx.lineWidth = 1.4; ctx.stroke();

        // faint phase word + seconds remaining, centred
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        try { ctx.letterSpacing = "0.24em"; } catch (e) {}
        ctx.font = `${Math.round(minDim * 0.024)}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
        ctx.fillStyle = `rgba(${INKv},0.62)`;
        ctx.fillText(phase.label.toUpperCase(), cx, cy - minDim * 0.012);
        try { ctx.letterSpacing = "0px"; } catch (e) {}
        const left = Math.max(1, Math.ceil(phase.d - local * phase.d));
        ctx.font = `${Math.round(minDim * 0.040)}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
        ctx.fillStyle = `rgba(${INKv},0.4)`;
        ctx.fillText(String(left), cx, cy + minDim * 0.028);
        ctx.restore();
      }
    }

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  // throttle elapsed updates to ~2/s
  const lastElapRef = useRef(0);
  function setElapsedThrottled(v) {
    if (Math.abs(v - lastElapRef.current) >= 1) { lastElapRef.current = v; setElapsed(v); }
  }

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ":" + String(ss).padStart(2, "0");
  };
  // human-readable "time until" for the wake timer: "7h 24m", "42m", "1m 30s"
  const fmtUntil = (sec) => {
    sec = Math.max(0, sec);
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
      return h + "h" + (m ? " " + m + "m" : "");
    }
    if (sec >= 90) return Math.round(sec / 60) + "m";
    const mm = Math.floor(sec / 60), ss2 = Math.floor(sec % 60);
    return (mm ? mm + "m " : "") + ss2 + "s";
  };

  const moodName = AmbientEngine.MOODS[params.mood] ? AmbientEngine.MOODS[params.mood].name : "";
  const ensembleName = AmbientEngine.ENSEMBLES[params.ensemble] ? AmbientEngine.ENSEMBLES[params.ensemble].name : "";
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

  return (
    <div className={"stage" + (immersive ? " immersive" : "") + (immersive && !vizUiVisible ? " hide-cursor" : "")}>
      <header className="head">
        <div className="head-left">
          <div className="eyebrow">Generative Ambient System</div>
          <h1 className="title">Loops<em>.</em></h1>
          <p className="subtitle">
            Unequal loops, each a single held note, drifting endlessly in and
            out of phase &mdash; so the music never repeats. After Brian Eno&rsquo;s tape pieces.
          </p>
        </div>
        <div className="transport">
          <div className="clock">
            <div><b>{playing ? "playing" : "paused"}</b></div>
            <div>{fmt(elapsed)}</div>
          </div>
          <button className="mandala-btn" onClick={() => setImmersive(true)} aria-label="Back to the mandala" title="Back to the mandala">
            <VizIcon /> <span>Mandala</span>
          </button>
          <button className="play-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </header>

      <div className="field-wrap">
        <canvas className="field" ref={canvasRef}></canvas>
        <div className="field-hint">{ensembleName} &middot; {moodName} &middot; {params.density} loops</div>
        {!playing && (
          <div className="idle-veil" onClick={toggle}>
            <span>press play to begin the drift</span>
          </div>
        )}
      </div>

      {families.length > 1 && (
        <div className="legend">
          {families.map((f) => (
            <span key={f} className="legend-item"><GlyphSVG family={f} /> {FAMILY_LABEL[f] || f}</span>
          ))}
        </div>
      )}

      <div className="controls">
        <nav className="panel-tabs" role="tablist" aria-label="Control sections">
          {SECTIONS.map((s) => (
            <button key={s.id} role="tab" id={"tab-" + s.id}
              aria-selected={section === s.id}
              aria-controls={"panel-" + s.id}
              className={"panel-tab" + (section === s.id ? " active" : "")}
              onClick={() => setSection(s.id)}>
              {s.name}
            </button>
          ))}
        </nav>

        {section === "scenes" && (
          <div className="panel-body" role="tabpanel" id="panel-scenes" aria-labelledby="tab-scenes">
            <div className="mood-row">
              <span className="row-label">Scene</span>
              <div className="moods">
                {SCENES.map((sc) => (
                  <button key={sc.name}
                    className={"mood" + (activeScene === sc.name ? " active" : "")}
                    onClick={() => applyScene(sc)}>
                    {sc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Yours</span>
              {library.length > 0 ? (
                <div className="moods saved-row">
                  {library.map((item) => (
                    <div key={item.id}
                      className={"saved" + (activeSaved === item.id ? " active" : "")}>
                      {renamingId === item.id ? (
                        <input className="saved-input" autoFocus defaultValue={item.name}
                          onBlur={(e) => renameSaved(item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            else if (e.key === "Escape") setRenamingId(null);
                          }} />
                      ) : (
                        <button className="saved-name" onClick={() => recallSaved(item)}
                          onDoubleClick={() => setRenamingId(item.id)}
                          title="Recall \u00b7 double-click to rename">
                          {item.name}
                        </button>
                      )}
                      <button className="saved-x" onClick={() => deleteSaved(item.id)}
                        aria-label="Remove from library" title="Remove">&times;</button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="saved-empty">save a drift you love &mdash; it lands here</span>
              )}
            </div>
          </div>
        )}

        {section === "voice" && (
          <div className="panel-body" role="tabpanel" id="panel-voice" aria-labelledby="tab-voice">
            <div className="mood-row">
              <span className="row-label">Mood</span>
              <div className="moods">
                {AmbientEngine.MOOD_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.mood === m ? " active" : "")}
                    onClick={() => update("mood", m)}>
                    {AmbientEngine.MOODS[m].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Ensemble</span>
              <div className="moods">
                {AmbientEngine.ENSEMBLE_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.ensemble === m ? " active" : "")}
                    onClick={() => update("ensemble", m)}>
                    {AmbientEngine.ENSEMBLES[m].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Tuning</span>
              <div className="moods tunings">
                {TUNINGS.map((t) => (
                  <button key={t.hz}
                    className={"tuning-opt" + (params.tuning === t.hz ? " active" : "")}
                    onClick={() => update("tuning", t.hz)}
                    title={t.title}>
                    <span className="tuning-hz">{t.name}</span>
                    <span className="tuning-note">{t.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "motion" && (
          <div className="panel-body" role="tabpanel" id="panel-motion" aria-labelledby="tab-motion">
            <div className="dials">
              <Dial name="Density" value={params.density} label={params.density + " loops"}
                min={2} max={12} step={1} onChange={(v) => update("density", v)} />
              <Dial name="Tempo" value={params.tempo} label={tempoLabel(params.tempo)}
                min={0} max={1} step={0.01} onChange={(v) => update("tempo", v)} />
              <Dial name="Drift" value={params.drift} label={driftLabel(params.drift)}
                min={0} max={1} step={0.01} onChange={(v) => update("drift", v)} />
              <Dial name="Register" value={params.register} label={registerLabel(params.register)}
                min={0} max={1} step={0.01} onChange={(v) => update("register", v)} />
              <Dial name="Evolve" value={params.evolve} label={evolveLabel(params.evolve)}
                min={0} max={1} step={0.01} onChange={(v) => update("evolve", v)} />
              <Dial name="Journey" value={params.journey} label={journeyLabel(params.journey)}
                min={0} max={1} step={0.01} onChange={(v) => update("journey", v)} />
            </div>
          </div>
        )}

        {section === "space" && (
          <div className="panel-body" role="tabpanel" id="panel-space" aria-labelledby="tab-space">
            <div className="dials">
              <Dial name="Space" value={params.space} label={spaceLabel(params.space)}
                min={0} max={1} step={0.01} onChange={(v) => update("space", v)} />
              <Dial name="Color" value={params.color} label={colorLabel(params.color)}
                min={0} max={1} step={0.01} onChange={(v) => update("color", v)} />
              <Dial name="Bloom" value={params.bloom} label={bloomLabel(params.bloom)}
                min={0} max={1} step={0.01} onChange={(v) => update("bloom", v)} />
              <Dial name="Stutter" value={params.stutter} label={stutterLabel(params.stutter)}
                min={0} max={1} step={0.01} onChange={(v) => update("stutter", v)} />
            </div>
          </div>
        )}

        {section === "atmos" && (
          <div className="panel-body" role="tabpanel" id="panel-atmos" aria-labelledby="tab-atmos">
            <div className="mood-row">
              <span className="row-label">Ambience</span>
              <div className="moods">
                {TEXTURES.map((t) => (
                  <button key={t.id}
                    className={"mood" + (texSet.has(t.id) ? " active" : "")}
                    onClick={() => toggleTexture(t.id)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Brainwaves</span>
              <div className="moods">
                {BRAINWAVES.map((b) => (
                  <button key={b.id}
                    className={"mood" + (params.binaural === b.id ? " active" : "")}
                    onClick={() => update("binaural", b.id)}
                    title={b.hz ? b.hz + " \u00b7 " + b.note : "Binaural beats off"}>
                    {b.name}
                  </button>
                ))}
                {params.binaural !== "off" && (() => {
                  const b = BRAINWAVES.find((x) => x.id === params.binaural);
                  return b ? <span className="bin-note">{b.hz} &middot; {b.note} &middot; headphones</span> : null;
                })()}
              </div>
            </div>
          </div>
        )}

        {section === "mixer" && (
          <div className="panel-body" role="tabpanel" id="panel-mixer" aria-labelledby="tab-mixer">
            <p className="mixer-intro">Balance the layers — the music, the ambience bed and the binaural tones each have their own level, under one master.</p>
            <div className="dials">
              <Dial name="Master" value={volume} label={pctLabel(volume)}
                min={0} max={1} step={0.01} onChange={setVolume} />
              <Dial name="Loops" value={params.looplevel} label={pctLabel(params.looplevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("looplevel", v)} />
              <Dial name="Ambience" value={params.texlevel} label={texlevelLabel(params.texlevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("texlevel", v)} />
              <Dial name="Beat" value={params.binlevel} label={params.binaural === "off" ? "off" : binlevelLabel(params.binlevel)}
                min={0} max={1} step={0.01} onChange={(v) => update("binlevel", v)} />
              <Dial name="Glue" value={params.glue} label={glueLabel(params.glue)}
                min={0} max={1} step={0.01} onChange={(v) => update("glue", v)} />
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="seed-block">
          <div className="seed-field">
            <label htmlFor="seed">Seed</label>
            <input id="seed" className="seed-input" type="number" value={params.seed}
              onChange={(e) => update("seed", Math.max(1, +e.target.value || 1))} />
          </div>
          <button className="ghost-btn" onClick={reshuffle}><DiceIcon /> Reshuffle</button>
          <button className="ghost-btn save-btn" onClick={saveCurrent}><SaveIcon /> Save this drift</button>
        </div>
        <div className="footer-right">
          <span className={"toast" + (savedToast ? " show" : "")}>kept in your library</span>
          <span className={"toast" + (copied ? " show" : "")}>link copied</span>
          {installPrompt && (
            <button className="ghost-btn" onClick={install}><InstallIcon /> Install app</button>
          )}
          <button className="ghost-btn" onClick={share}><LinkIcon /> Copy share link</button>
        </div>
      </footer>

      {immersive && (
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
          <button className="viz-chip mini" onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Windowed" : "Fullscreen"}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </button>
        </div>
      )}

      {immersive && (
        <div className={"cast-caption" + (vizUiVisible ? " show" : "")}>
          <b>Loops</b>
          <span className="dot">&middot;</span>
          <span>{ensembleName}</span>
          <span className="dot">&middot;</span>
          <span>{moodName}</span>
          {activeScene && (<><span className="dot">&middot;</span><span>{activeScene}</span></>)}
        </div>
      )}

      {immersive && sessionEnd > 0 && (
        <div className="session-immersive">
          <span className="session-immersive-ico" aria-hidden="true"><BellIcon /></span>
          {fmt(sessionRemain)}
        </div>
      )}

      {immersive && journey && sessionEnd === 0 && (
        <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
          <span className="journey-immersive-name">{journey.name}</span>
          <span className="session-meta-sep">&middot;</span>
          {fmt(journeyRemain)}
        </div>
      )}

      {immersive && driftOn && !journey && sessionEnd === 0 && (
        <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
          <span className="journey-immersive-name">Endless Drift</span>
          <span className="session-meta-sep">&middot;</span>
          {driftNow}
        </div>
      )}

      {immersive && (
        <button
          className={"mandala-core" + (playing ? " playing" : " paused") + (vizUiVisible ? " ui" : "") + (breathOn ? " breath" : "")}
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}

      {immersive && (
        <div className={"dock" + (vizUiVisible ? " show" : "")}>
          <span className="dock-time">{fmt(elapsed)}</span>
          <span className="dock-sep" aria-hidden="true"></span>
          <button className="dock-item" onClick={() => setImmersive(false)}>
            <SlidersIcon /><span>Sound</span>
          </button>
          <button className={"dock-item" + (breathOn ? " on" : "")} onClick={() => setBreathOn((b) => !b)}>
            <BreathIcon /><span>Breathe</span>
          </button>
          <button className={"dock-item" + (sessionEnd > 0 ? " on" : "")}
            onClick={() => setSheet((s) => (s === "session" ? null : "session"))}>
            <BellIcon /><span>Session</span>
          </button>
          <button className={"dock-item" + ((journey || driftOn) ? " on" : "")}
            onClick={() => setSheet((s) => (s === "journey" ? null : "journey"))}>
            <RouteIcon /><span>Journey</span>
          </button>
          <span className="dock-sep" aria-hidden="true"></span>
          <button className="dock-icon" onClick={() => setSheet((s) => (s === "info" ? null : "info"))} aria-label="About Loops">
            <InfoIcon />
          </button>
        </div>
      )}

      {immersive && sheet && (
        <div className="sheet-scrim" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-x" onClick={() => setSheet(null)} aria-label="Close"><CloseIcon /></button>

            {sheet === "session" && (
              <div className="sheet-body">
                {!sessionEnd ? (
                  <>
                    <h2 className="sheet-title">Session</h2>
                    <p className="sheet-lede">A timed sit, opened and closed by a singing bowl.</p>
                    <div className="sheet-group">
                      <span className="sheet-label">Length</span>
                      <div className="session-chips">
                        {SESSION_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sessionPick === m ? " active" : "")}
                            onClick={() => setSessionPick(m)}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="sheet-group">
                      <span className="sheet-label">Interval bell</span>
                      <div className="session-chips">
                        {INTERVAL_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sessionInterval === m ? " active" : "")}
                            onClick={() => setSessionInterval(m)}>{m === 0 ? "None" : "every " + m + "m"}</button>
                        ))}
                      </div>
                    </div>
                    <button className="session-begin" onClick={() => { beginSession(sessionPick); setSheet(null); }}>
                      <BellIcon /> Begin {sessionPick}-minute session
                    </button>
                    <div className="sheet-group sheet-aside">
                      <span className="sheet-label">Or drift off &mdash; fade to sleep</span>
                      <div className="session-chips">
                        {SLEEP_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (sleepDur === m ? " active" : "")}
                            onClick={() => { setSleep(sleepDur === m ? 0 : m); setSheet(null); }}>{m} min</button>
                        ))}
                      </div>
                    </div>
                    <div className="sheet-group">
                      <span className="sheet-label">Or wake gently &mdash; sunrise rise</span>
                      <div className="session-chips">
                        {WAKE_OPTS.map((m) => (
                          <button key={m} className={"chip lg" + (wakeIn === m ? " active" : "")}
                            onClick={() => { setWake(wakeIn === m ? 0 : m); setSheet(null); }}>
                            {m < 60 ? m + " min" : (m / 60) + "h"}
                          </button>
                        ))}
                      </div>
                      {wakeAt > 0 && !wakeRising && (
                        <div className="wake-status">
                          <SunriseIcon /> Rising in <em>{fmtUntil((wakeAt - Date.now()) / 1000)}</em>
                          <button className="export-again" onClick={() => setWake(0)}>Cancel</button>
                        </div>
                      )}
                      {wakeRising && (
                        <div className="wake-status rising">
                          <SunriseIcon /> Sunrise &mdash; rising now
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="session-live">
                    <h2 className="sheet-title">Session</h2>
                    <div className="session-clock">{fmt(sessionRemain)}</div>
                    <div className="session-bar"><div className="session-bar-fill"
                      style={{ width: (sessionTotalRef.current ? Math.min(100, (1 - sessionRemain / sessionTotalRef.current) * 100) : 0) + "%" }}></div></div>
                    <div className="session-meta">
                      {sessionInterval > 0 ? <span><BellIcon /> bell every {sessionInterval} min</span> : <span>silence between the bells</span>}
                    </div>
                    <button className="session-begin end" onClick={() => { endSession(); setSheet(null); }}>End session</button>
                  </div>
                )}
              </div>
            )}

            {sheet === "journey" && (
              <div className="sheet-body">
                {journey ? (
                  <div className="journey-live">
                    <h2 className="sheet-title">{journey.name}</h2>
                    <div className="journey-live-top">
                      <span className="journey-live-time">{fmt(journeyRemain)} left</span>
                    </div>
                    <div className="journey-track">
                      <div className="journey-track-fill" style={{ width: ((1 - journeyRemain / (journey.total * 60)) * 100) + "%" }}></div>
                      {journey.stops.map((nm, i) => {
                        const n = journey.stops.length;
                        return <span key={i} className={"journey-node" + (i <= journeyStop ? " reached" : "")} style={{ left: (i / (n - 1)) * 100 + "%" }} title={nm}></span>;
                      })}
                    </div>
                    <div className="journey-path">
                      {journey.stops.map((nm, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="journey-arrow">&rarr;</span>}
                          <span className={"journey-stopname" + (i === journeyStop ? " now" : "") + (i < journeyStop ? " past" : "")}>{nm}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <button className="session-begin end" onClick={() => { cancelJourney(); setSheet(null); }}>End journey</button>
                  </div>
                ) : driftOn ? (
                  <div className="journey-live">
                    <h2 className="sheet-title">Endless Drift</h2>
                    <p className="sheet-lede">Wandering gently between kindred scenes. It never ends &mdash; stop it whenever you like.</p>
                    <div className="drift-now">
                      <span className="drift-now-name">{driftNow}</span>
                      <span className="journey-arrow drift-to">&rarr;</span>
                      <span className="drift-next-name">{driftNext}</span>
                    </div>
                    <div className="journey-track">
                      <div className="journey-track-fill" style={{ width: (driftProgress * 100) + "%" }}></div>
                    </div>
                    <div className="drift-cap">drifting toward <em>{driftNext}</em></div>
                    <button className="session-begin end" onClick={() => { cancelDrift(); setSheet(null); }}>End drift</button>
                  </div>
                ) : (
                  <>
                    <h2 className="sheet-title">Journeys</h2>
                    <p className="sheet-lede">Timed arcs that travel between scenes &mdash; the mandala leads, you follow.</p>
                    <button className="journey-card drift-card" onClick={() => { beginDrift(); setSheet(null); }}>
                      <div className="journey-card-top">
                        <span className="journey-card-name">Endless Drift</span>
                        <span className="journey-card-dur">&infin;</span>
                      </div>
                      <p className="journey-card-blurb">A never-ending wander between kindred calm scenes &mdash; set it and let it run.</p>
                      <div className="journey-card-path">
                        {DRIFT_POOL.slice(0, 4).map((nm, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="journey-arrow">&middot;</span>}
                            <span>{nm}</span>
                          </React.Fragment>
                        ))}
                        <span className="journey-arrow">&hellip;</span>
                      </div>
                    </button>
                    <div className="journey-cards">
                      {JOURNEYS.map((j) => (
                        <button key={j.id} className="journey-card" onClick={() => { beginJourney(j); setSheet(null); }}>
                          <div className="journey-card-top">
                            <span className="journey-card-name">{j.name}</span>
                            <span className="journey-card-dur">{j.total} min</span>
                          </div>
                          <p className="journey-card-blurb">{j.blurb}</p>
                          <div className="journey-card-path">
                            {j.stops.map((nm, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <span className="journey-arrow">&rarr;</span>}
                                <span>{nm}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {sheet === "info" && (
              <div className="sheet-body">
                <div className="info-eyebrow">Generative Ambient System</div>
                <h2 className="info-title">Loops<em>.</em></h2>
                <p className="info-sub">
                  Unequal loops, each a single held note, drifting endlessly in and out of phase
                  &mdash; so the music never repeats. After Brian Eno&rsquo;s tape pieces.
                </p>
                <p className="info-now">Now playing &middot; {ensembleName} &middot; {moodName}{activeScene ? " \u00b7 " + activeScene : ""}</p>
                <div className="info-actions">
                  <button className="ghost-btn accent" onClick={() => setSheet("export")}><DownloadIcon /> Export this drift</button>
                  <button className="ghost-btn" onClick={() => { setSheet(null); setImmersive(false); }}><SlidersIcon /> Open Sound &amp; tuning</button>
                  <button className="ghost-btn" onClick={share}>{copied ? "Link copied" : "Copy share link"}</button>
                  <button className="ghost-btn" onClick={toggleFullscreen}>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
                  {installPrompt && <button className="ghost-btn" onClick={install}>Install app</button>}
                </div>
                <div className="info-foot">headphones recommended &middot; tuned to <em>{activeScene || moodName}</em></div>
              </div>
            )}

            {sheet === "export" && (
              <div className="sheet-body">
                <h2 className="sheet-title">Export this drift</h2>
                <p className="sheet-lede">Render what&rsquo;s playing now to a WAV file you can keep &mdash; the loops will keep phasing for the whole length, so it never loops.</p>
                <div className="sheet-group">
                  <span className="sheet-label">Length</span>
                  <div className="session-chips">
                    {EXPORT_OPTS.map((m) => (
                      <button key={m}
                        className={"chip lg" + (exportMin === m ? " active" : "")}
                        disabled={exportState === "rendering"}
                        onClick={() => setExportMin(m)}>{m} min</button>
                    ))}
                  </div>
                </div>
                {exportState === "rendering" ? (
                  <div className="export-progress">
                    <div className="session-bar"><div className="session-bar-fill" style={{ width: Math.round(exportPct * 100) + "%" }}></div></div>
                    <div className="export-status">Rendering &amp; normalising&hellip; {Math.round(exportPct * 100)}%</div>
                  </div>
                ) : (
                  <button className="session-begin" onClick={() => doExport(exportMin)}>
                    <DownloadIcon /> Render {exportMin}-minute WAV
                  </button>
                )}
                {exportState === "done" && <div className="export-status done">Saved &mdash; check your downloads. <button className="export-again" onClick={() => doExport(exportMin)}>Render another</button></div>}
                {exportState === "error" && <div className="export-status err">Render failed &mdash; try a shorter length.</div>}
                <div className="info-foot">{ensembleName} &middot; {moodName}{activeScene ? " \u00b7 " + activeScene : ""} &middot; 44.1kHz stereo WAV</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showWelcome && (
        <div className={"welcome" + (welcomeHiding ? " hide" : "")}>
          <div className="welcome-rings" aria-hidden="true">
            <i></i><i></i><i></i><i></i>
            <span className="seed"></span>
            <span className="core"></span>
          </div>
          <div className="welcome-word">
            <div className="welcome-eyebrow">Generative Ambient System</div>
            <h1 className="welcome-title">Loops<em>.</em></h1>
            <p className="welcome-sub">
              Unequal loops, each a single held note, drifting endlessly in and
              out of phase &mdash; so the music never repeats.
            </p>
            <p className="welcome-whisper">{welcomeWhisper(new Date().getHours())}</p>
          </div>
          <button className="welcome-begin" onClick={begin}>
            <PlayIcon /> Begin the drift
          </button>
          <div className="welcome-foot">
            {partOfDay(new Date().getHours()).toLowerCase()} &middot; tuned to <em>{WELCOME.name}</em> &middot; headphones recommended
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// ---- UI constants ---------------------------------------------------

// binaural-beat bands — each entry's hz is the perceived beat rate
export const BRAINWAVES = [
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
export const BREATH_PATTERNS = {
  calm: Object.assign(makeBreath(5.5, 0, 5.5, 0), { name: "Coherent" }),  // ~5.5 breaths/min
  box:  Object.assign(makeBreath(4, 4, 4, 4),     { name: "Box" }),       // 4-4-4-4
  "478":Object.assign(makeBreath(4, 7, 8, 0),     { name: "4-7-8" }),     // relaxing
};
export const BREATH_ORDER = ["calm", "box", "478"];

// ---- tuning: reference pitch A4 --------------------------------------
export const TUNINGS = [
  { hz: 415, name: "415 Hz", note: "baroque, mellow",   title: "A4 = 415 Hz · historical period tuning, a soft semitone down" },
  { hz: 432, name: "432 Hz", note: "natural, grounding",title: "A4 = 432 Hz · the “natural”/Verdi tuning" },
  { hz: 440, name: "440 Hz", note: "concert standard",  title: "A4 = 440 Hz · modern concert pitch" },
  { hz: 444, name: "528 Hz", note: "transformation",    title: "A4 = 444 Hz · tunes C to 528 Hz (Solfeggio MI)" },
  { hz: 448, name: "448 Hz", note: "bright, lifting",    title: "A4 = 448 Hz · a brilliant, slightly sharp tuning" },
];

// control panel is split into calm, focused groups (progressive disclosure)
export const SECTIONS = [
  { id: "scenes", name: "Scenes" },
  { id: "voice",  name: "Voice" },
  { id: "motion", name: "Motion" },
  { id: "space",  name: "Space" },
  { id: "atmos",  name: "Atmosphere" },
  { id: "mixer",  name: "Mixer" },
];

// synthesized ambience layers — combine freely under the music
export const TEXTURES = [
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
export const KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "space", "color", "stutter", "bloom", "evolve", "journey", "glue", "tuning", "binaural", "binlevel", "texture", "texlevel", "looplevel", "seed"];
export const STR_KEYS = { mood: "reflection", ensemble: "piano", binaural: "off", texture: "" };
export const INT_KEYS = { density: true, seed: true };
export const NUM_DEFAULTS = { density: 6, tempo: 0.5, drift: 0.55, register: 0.5, space: 0.6, color: 0.5, stutter: 0.15, bloom: 0.2, evolve: 0.4, journey: 0, glue: 0.25, tuning: 440, binlevel: 0.4, texlevel: 0.5, looplevel: 1, seed: 1148 };

// ---- curated scenes: one tap sets the whole instrument ---------------
export const SCENES = [
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
export const SCENE_DIAL_KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "space", "color", "stutter", "bloom", "evolve", "journey", "glue", "tuning", "binaural", "binlevel", "texture", "texlevel", "looplevel"];
export const SCENE_BY_NAME = {};
SCENES.forEach((s) => { SCENE_BY_NAME[s.name] = s; });

// ---- journeys: programmed arcs that travel between scenes over time -------
export const JOURNEY_STEP_KEYS = ["mood", "ensemble", "density", "tempo", "drift", "register", "texture", "binaural", "tuning"];
export const JOURNEY_CONT_KEYS = ["space", "color", "stutter", "bloom", "evolve", "glue", "binlevel", "texlevel", "looplevel"];
export const JOURNEYS = [
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

// ---- endless drift: an open-ended journey that never stops ---------------
export const DRIFT_POOL = ["Deep Rest", "Stillness", "Tide", "Reverie", "Clear Mind", "Inner Sun"];
export const DRIFT_SEG_MIN = 165;  // seconds — shortest leg between scenes
export const DRIFT_SEG_MAX = 285;  // seconds — longest leg
export const EXPORT_OPTS = [1, 2, 3, 5];   // export lengths in minutes

export const SLEEP_OPTS = [15, 30, 45, 60];
export const SLEEP_FADE = 45; // seconds of gentle fade at the end

export const WAKE_OPTS = [30, 60, 240, 480];   // 30m nap → full night
export const WAKE_RISE = 90;                    // seconds of rise from silence

// ---- meditation session: a timed sit framed by singing-bowl bells --------
export const SESSION_OPTS = [5, 10, 15, 20, 30, 45];   // minutes
export const INTERVAL_OPTS = [0, 3, 5, 10];             // interval-bell spacing, 0 = none
export const SESSION_DUCK = 7;                          // seconds the field fades under the closing bells

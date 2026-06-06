// ---- harmonic palettes (always consonant) --------------------------
// root = pitch-class offset, notes = semitone degrees within an octave
export const MOODS = {
  reflection: { name: "Reflection", root: 0,  notes: [0, 2, 4, 7, 9] },        // C major pentatonic
  drift:      { name: "Drift",      root: 2,  notes: [0, 2, 4, 7, 11] },       // D lydian-ish, airy maj7
  dusk:       { name: "Dusk",       root: 9,  notes: [0, 3, 5, 7, 10] },       // A dorian / minor pentatonic
  elegy:      { name: "Elegy",      root: 4,  notes: [0, 3, 7, 8, 10] },       // E minor with a b6 ache
  suspended:  { name: "Suspended",  root: 7,  notes: [0, 2, 5, 7, 10] },       // G quartal / sus
  curious:    { name: "Curious",    root: 5,  notes: [0, 2, 6, 7, 9] },        // F lydian, questioning #4 wonder
  pensive:    { name: "Pensive",    root: 2,  notes: [0, 2, 3, 7, 10] },       // D minor with a thoughtful 9th
  open:       { name: "Open",       root: 0,  notes: [0, 2, 5, 7, 9] },        // C sus pentatonic, no thirds — spacious
  vast:       { name: "Vast",       root: 9,  notes: [0, 2, 7, 9, 11] },       // A fifth-rooted, luminous maj7 sky
};

export const MOOD_ORDER = ["reflection", "drift", "dusk", "elegy", "suspended", "curious", "pensive", "open", "vast"];

// ---- instruments (all synthesized) ---------------------------------
// family drives the visual glyph; sustained voices swell within their loop.
export const INSTRUMENTS = {
  piano:   { family: "piano",   wave: "sine",     sustained: false,
             partials: [[1, 1], [2, 0.5], [3.01, 0.24], [4.99, 0.1]],
             attack: 0.012, decayLow: 6.6, decayHigh: 2.4,
             cutBase: 650, cutColor: 3600, cutTrack: 0.5, hammer: 0.05, gain: 1.0 },
  bell:    { family: "bell",    wave: "sine",     sustained: false,
             partials: [[1, 1], [2.76, 0.55], [5.40, 0.32], [8.93, 0.16]],
             attack: 0.005, decayLow: 9.0, decayHigh: 4.0,
             cutBase: 1200, cutColor: 4600, cutTrack: 0.75, hammer: 0.02, gain: 0.7 },
  marimba: { family: "marimba", wave: "sine",     sustained: false,
             partials: [[1, 1], [3.93, 0.42], [10.4, 0.14]],
             attack: 0.004, decayLow: 1.7, decayHigh: 0.7,
             cutBase: 1400, cutColor: 3000, cutTrack: 0.6, hammer: 0.06, gain: 0.95 },
  harp:    { family: "harp",    wave: "triangle", sustained: false,
             partials: [[1, 1], [2, 0.4], [3, 0.18], [4, 0.08]],
             attack: 0.005, decayLow: 3.4, decayHigh: 1.5,
             cutBase: 900, cutColor: 3500, cutTrack: 0.55, hammer: 0.07, gain: 0.9 },
  handpan: { family: "handpan", wave: "sine",     sustained: false,
             // fundamental + octave + compound fifth (3x), with two faintly
             // inharmonic metallic shimmer partials -> the soft steel "ring"
             partials: [[1, 1], [2, 0.55], [3, 0.32], [4.07, 0.12], [5.42, 0.05]],
             attack: 0.009, decayLow: 5.6, decayHigh: 2.7,
             cutBase: 760, cutColor: 3500, cutTrack: 0.62, hammer: 0.035, gain: 0.9 },
  kalimba: { family: "kalimba", wave: "sine",     sustained: false,
             // plucked metal tine: bright fundamental + a sweet octave and a
             // faint inharmonic ping, gentle and quick to bloom
             partials: [[1, 1], [2.01, 0.34], [3.86, 0.16], [6.1, 0.05]],
             attack: 0.004, decayLow: 2.6, decayHigh: 1.2,
             cutBase: 1050, cutColor: 3000, cutTrack: 0.6, hammer: 0.04, gain: 0.72 },
  woodblock:{ family: "wood",   wave: "sine",     sustained: false,
             // hollow wooden knock: inharmonic modes, very short ring
             partials: [[1, 1], [2.61, 0.4], [4.18, 0.14]],
             attack: 0.002, decayLow: 0.5, decayHigh: 0.28,
             cutBase: 1250, cutColor: 2200, cutTrack: 0.5, hammer: 0.12, gain: 0.62 },
  framedrum:{ family: "frame",  wave: "sine",     sustained: false,
             // soft membrane thud: low fundamental + membrane modes, skin slap
             partials: [[1, 1], [1.59, 0.3], [2.14, 0.12]],
             attack: 0.003, decayLow: 0.95, decayHigh: 0.5,
             cutBase: 420, cutColor: 1300, cutTrack: 0.5, hammer: 0.18, gain: 0.95 },
  strings: { family: "strings", wave: "sawtooth", sustained: true,
             partials: [[1, 1], [2, 0.5], [3, 0.28]], detune: 7, oscVoices: 3,
             cutBase: 900, cutColor: 2600, cutTrack: 1, vibrato: { depth: 7, rate: 5 },
             breath: 0, gain: 0.42, swellAtk: 0.34, swellRel: 0.46 },
  choir:   { family: "choir",   wave: "sawtooth", sustained: true,
             partials: [[1, 1]], detune: 9, oscVoices: 3,
             formant: [[700, 1], [1150, 0.55], [2600, 0.3]],
             vibrato: { depth: 9, rate: 5.2 }, breath: 0.05, gain: 0.5,
             swellAtk: 0.34, swellRel: 0.5 },
  flute:   { family: "flute",   wave: "sine",     sustained: true,
             partials: [[1, 1], [2, 0.16]], detune: 0, oscVoices: 1,
             cutBase: 1700, cutColor: 2800, cutTrack: 1, vibrato: { depth: 6, rate: 5.6 },
             breath: 0.09, gain: 0.55, swellAtk: 0.22, swellRel: 0.4 },
  drone:   { family: "drone",   wave: "triangle", sustained: true,
             partials: [[1, 1], [2, 0.4], [4, 0.14]], detune: 5, oscVoices: 2,
             cutBase: 700, cutColor: 1800, cutTrack: 1, vibrato: { depth: 3, rate: 3 },
             breath: 0, gain: 0.46, swellAtk: 0.38, swellRel: 0.5 },

  // ---- gentle 8-bit (chiptune) ------------------------------------
  // soft pulse waves rounded off by the per-note lowpass so they chime
  // rather than buzz; the triangle "bass" nods to the NES triangle channel.
  chiplead: { family: "chip", wave: "square", sustained: false,
             partials: [[1, 1], [2, 0.16]],
             attack: 0.008, decayLow: 1.7, decayHigh: 1.0,
             cutBase: 720, cutColor: 2500, cutTrack: 0.7, hammer: 0.02, gain: 0.4 },
  chipblip: { family: "chip", wave: "square", sustained: false,
             // short arcade pluck — a clean blip that bows out quickly
             partials: [[1, 1]],
             attack: 0.004, decayLow: 0.55, decayHigh: 0.34,
             cutBase: 920, cutColor: 2600, cutTrack: 0.8, hammer: 0.02, gain: 0.34 },
  chipbass: { family: "chip", wave: "triangle", sustained: false,
             // mellow triangle bass, longer ring, no hammer noise
             partials: [[1, 1], [2, 0.12]],
             attack: 0.006, decayLow: 2.6, decayHigh: 1.4,
             cutBase: 480, cutColor: 1300, cutTrack: 0.6, hammer: 0.0, gain: 0.58 },

  // ---- world / ethnic percussion ----------------------------------
  tabla:   { family: "tabla",   wave: "sine",     sustained: false,
             // tuned hand drum: strong harmonic overtones, sharp ringing slap
             partials: [[1, 1], [2.0, 0.5], [3.0, 0.28], [4.1, 0.12]],
             attack: 0.002, decayLow: 0.95, decayHigh: 0.42,
             cutBase: 900, cutColor: 2800, cutTrack: 0.6, hammer: 0.14, gain: 0.72 },
  udu:     { family: "udu",     wave: "sine",     sustained: false,
             // clay pot: deep rounded "boop", almost no overtone, very short
             partials: [[1, 1], [2.6, 0.14]],
             attack: 0.003, decayLow: 0.6, decayHigh: 0.32,
             cutBase: 320, cutColor: 1100, cutTrack: 0.5, hammer: 0.16, gain: 0.95 },
  balafon: { family: "balafon", wave: "sine",     sustained: false,
             // wooden gourd xylophone: bright bar with a buzzy resonator partial
             partials: [[1, 1], [2.8, 0.44], [5.2, 0.2], [7.1, 0.08]],
             attack: 0.003, decayLow: 1.3, decayHigh: 0.6,
             cutBase: 1300, cutColor: 2800, cutTrack: 0.6, hammer: 0.1, gain: 0.7 },
  bowl:    { family: "bowl",    wave: "sine",     sustained: false,
             // singing bowl / small gong: inharmonic shimmer with a long tail
             partials: [[1, 1], [2.32, 0.6], [3.5, 0.34], [4.8, 0.18], [6.7, 0.08]],
             attack: 0.02, decayLow: 8.0, decayHigh: 4.5,
             cutBase: 800, cutColor: 3200, cutTrack: 0.7, hammer: 0.0, gain: 0.58 },

  // ---- Glitch family: multi-note gestures fired once per loop strike ----
  // these have no partials/decay; playVoice routes `kind` to a custom synth
  // that schedules a little burst from the single strike time.
  arp:     { family: "arp",     kind: "arp",     wave: "triangle", sustained: false, gain: 0.85 },
  chirp:   { family: "chirp",   kind: "chirp",   wave: "sine",     sustained: false, gain: 0.70 },
  trill:   { family: "trill",   kind: "trill",   wave: "triangle", sustained: false, gain: 0.78 },
};

// curated pools the seed draws from; "orchestra" is the random mix
export const ENSEMBLES = {
  piano:     { name: "Felt Piano", pool: ["piano"] },
  glasswork: { name: "Glasswork",  pool: ["bell", "piano", "marimba", "bell"] },
  handpan:   { name: "Handpan",    pool: ["handpan", "handpan", "drone", "handpan"] },
  percussion:{ name: "Percussion", pool: ["kalimba", "framedrum", "woodblock", "kalimba", "framedrum"] },
  world:     { name: "World",      pool: ["tabla", "balafon", "udu", "framedrum", "kalimba", "handpan", "bowl"] },
  eightbit:  { name: "8-Bit",      pool: ["chiplead", "chipblip", "chipbass", "chiplead", "chipblip"] },
  strings:   { name: "Strings",    pool: ["strings", "drone", "strings"] },
  choir:     { name: "Choir",      pool: ["choir", "flute", "choir", "drone"] },
  glitch:    { name: "Glitch",     pool: ["arp", "chirp", "arp", "trill", "chirp"] },
  orchestra: { name: "Orchestra",  pool: ["piano", "bell", "strings", "choir", "flute", "harp", "marimba", "handpan", "kalimba", "framedrum", "drone"] },
};
export const ENSEMBLE_ORDER = ["piano", "glasswork", "handpan", "percussion", "world", "eightbit", "glitch", "strings", "choir", "orchestra"];

// ---- binaural beats -----------------------------------------------
// two pure sines, one isolated to each ear; the small frequency offset
// between them is perceived (only on headphones) as a slow "beat" whose
// rate falls in a classic brainwave band. Kept dry & channel-isolated so
// the binaural effect survives intact. Values are the beat rate in Hz.
export const BINAURAL = { off: 0, delta: 2.5, theta: 6.0, alpha: 10.0, beta: 18.0 };
export const BIN_CARRIER = 128; // soft low carrier the beat rides on

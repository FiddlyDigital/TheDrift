/* Loops — generative ambient engine
   Felt-piano synthesis + generated reverb + unequal-loop scheduler.
   Plain JS, exposed as window.AmbientEngine. The UI reads engine state
   each animation frame; the engine never touches the DOM. */
(function () {
  "use strict";

  // ---- seeded RNG (mulberry32) ---------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- harmonic palettes (always consonant) --------------------------
  // root = pitch-class offset, notes = semitone degrees within an octave
  const MOODS = {
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

  const MOOD_ORDER = ["reflection", "drift", "dusk", "elegy", "suspended", "curious", "pensive", "open", "vast"];

  // ---- instruments (all synthesized) ---------------------------------
  // family drives the visual glyph; sustained voices swell within their loop.
  const INSTRUMENTS = {
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
  };

  // curated pools the seed draws from; "orchestra" is the random mix
  const ENSEMBLES = {
    piano:     { name: "Felt Piano", pool: ["piano"] },
    glasswork: { name: "Glasswork",  pool: ["bell", "piano", "marimba", "bell"] },
    handpan:   { name: "Handpan",    pool: ["handpan", "handpan", "drone", "handpan"] },
    percussion:{ name: "Percussion", pool: ["kalimba", "framedrum", "woodblock", "kalimba", "framedrum"] },
    world:     { name: "World",      pool: ["tabla", "balafon", "udu", "framedrum", "kalimba", "handpan", "bowl"] },
    eightbit:  { name: "8-Bit",      pool: ["chiplead", "chipblip", "chipbass", "chiplead", "chipblip"] },
    strings:   { name: "Strings",    pool: ["strings", "drone", "strings"] },
    choir:     { name: "Choir",      pool: ["choir", "flute", "choir", "drone"] },
    orchestra: { name: "Orchestra",  pool: ["piano", "bell", "strings", "choir", "flute", "harp", "marimba", "handpan", "kalimba", "framedrum", "drone"] },
  };
  const ENSEMBLE_ORDER = ["piano", "glasswork", "handpan", "percussion", "world", "eightbit", "strings", "choir", "orchestra"];

  // ---- binaural beats -----------------------------------------------
  // two pure sines, one isolated to each ear; the small frequency offset
  // between them is perceived (only on headphones) as a slow "beat" whose
  // rate falls in a classic brainwave band. Kept dry & channel-isolated so
  // the binaural effect survives intact. Values are the beat rate in Hz.
  const BINAURAL = { off: 0, delta: 2.5, theta: 6.0, alpha: 10.0, beta: 18.0 };
  const BIN_CARRIER = 128; // soft low carrier the beat rides on

  function midiToFreq(m, a4) { return (a4 || 440) * Math.pow(2, (m - 69) / 12); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ---- engine --------------------------------------------------------
  function AmbientEngine() {
    this.ctx = null;
    this.playing = false;
    this.voices = [];
    this.userVolume = 0.85;   // 0..1 master listening level
    this.params = {
      mood: "reflection",
      ensemble: "piano", // instrument palette
      density: 6,     // number of loops (2..12)
      tempo: 0.5,     // pace 0..1 (slow..fast), scales loop lengths
      drift: 0.55,    // length spread 0..1
      register: 0.5,  // low..high 0..1
      space: 0.6,     // reverb 0..1
      color: 0.5,     // timbral brightness 0..1
      stutter: 0.15,  // chance of random tape-stutter effects 0..1
      bloom: 0.2,     // FM shimmer depth — glassy overtones that collide 0..1
      evolve: 0.4,    // autonomous slow drift — re-voices the field over time 0..1
      journey: 0,     // autonomous mood migration over time 0..1 (0 = off)
      glue: 0.25,     // output compression amount 0..1 (transparent..pumping)
      tuning: 440,    // reference pitch A4 in Hz (432 healing / 444 = C528 / 440 std)
      binaural: "off",// binaural-beat band id (off/delta/theta/alpha/beta)
      binlevel: 0.4,  // binaural tone level 0..1
      texture: "",    // active ambience layers, "." joined (rain.vinyl…)
      texlevel: 0.5,  // ambience bed level 0..1
      looplevel: 1,   // generative loop (music) level 0..1
      seed: 1148,
    };
    this._fading = [];        // fields fading out during a crossfade
    this._evo = { color: 0, bloom: 0 }; // live evolve offsets (read in synth)
    this._textures = {};      // active texture id -> node handle
    this._activeTex = [];     // texture ids that should be running
    this._journeyNext = 0;    // ctx-time of the next autonomous mood move
    this.onJourney = null;    // callback(info) when journey changes the field
    this._timer = null;
    this.lookahead = 0.28;  // seconds scheduled ahead
    this.tickMs = 55;
    this._impulseKey = null;
  }

  AmbientEngine.MOODS = MOODS;
  AmbientEngine.MOOD_ORDER = MOOD_ORDER;
  AmbientEngine.INSTRUMENTS = INSTRUMENTS;
  AmbientEngine.ENSEMBLES = ENSEMBLES;
  AmbientEngine.ENSEMBLE_ORDER = ENSEMBLE_ORDER;
  AmbientEngine.BINAURAL = BINAURAL;

  AmbientEngine.prototype.ensureContext = function (injected) {
    if (this.ctx) return;
    let ctx;
    if (injected) {
      ctx = injected;
    } else {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    this.ctx = ctx;

    // master chain: bus -> [dry, convolver->wet] -> warmth lowpass -> comp -> master -> out
    this.bus = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.convolver = ctx.createConvolver();

    // the active loop-field feeds the bus through its own gain so a whole
    // field can be crossfaded out while a new one fades in (scene changes)
    this.fieldOut = ctx.createGain();
    this.fieldOut.gain.value = 1;
    this.fieldOut.connect(this.bus);
    this._fading = this._fading || [];

    this.warm = ctx.createBiquadFilter();
    this.warm.type = "lowpass";
    this.warm.frequency.value = 6200;
    this.warm.Q.value = 0.2;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 24;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.4;

    // makeup gain after the compressor so heavier "glue" doesn't drop the
    // overall level — the louder we squeeze, the more we give back
    this.compMakeup = ctx.createGain();
    this.compMakeup.gain.value = 1;

    // loudness leveler: a slow auto-gain riding the music + ambience program so
    // a sparse 4-loop felt-piano scene and a dense 10-loop orchestra land near
    // the same perceived level. Feed-forward (measures the pre-trim program via
    // its own analyser) so the control loop can't oscillate or pump.
    this.levelTrim = ctx.createGain();
    this.levelTrim.gain.value = 1;
    this.autoLevel = true;
    this._trim = 1;
    this._progAna = ctx.createAnalyser();
    this._progAna.fftSize = 1024;
    this._progAna.smoothingTimeConstant = 0.85;
    this._progFreq = new Uint8Array(this._progAna.frequencyBinCount);

    this.master = ctx.createGain();
    this.master.gain.value = this.userVolume * 0.92;

    // dedicated post-master gain used only for the sleep-timer fade, so the
    // listening-volume control and the fade never fight over master.gain
    this.fade = ctx.createGain();
    this.fade.gain.value = 1;

    // safety brick-wall limiter — the final node before output. Catches the
    // full summed mix (loops + ambience + binaural + bells) so stacking layers
    // or a loud scene can never clip the output.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;

    // loop (music) level — sits between the field bus and the dry/wet split so
    // the mixer can ride the generative loops independently of the ambience
    // bed (which joins later at `warm`) and the binaural tones (at `master`).
    this.loopGain = ctx.createGain();
    this.loopGain.gain.value = this.params.looplevel == null ? 1 : this.params.looplevel;

    this.bus.connect(this.loopGain);
    this.loopGain.connect(this.dry);
    this.loopGain.connect(this.convolver);
    this.convolver.connect(this.wet);
    this.dry.connect(this.warm);
    this.wet.connect(this.warm);
    this.warm.connect(this.comp);
    this.comp.connect(this.compMakeup);
    // program → leveler → master; a parallel tap feeds the leveler's analyser
    this.compMakeup.connect(this._progAna);
    this.compMakeup.connect(this.levelTrim);
    this.levelTrim.connect(this.master);
    this.master.connect(this.fade);
    this.fade.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    // ---- analyser: tap the post-master signal so the visuals can react to
    // the *actual* output (loudness + a rough low/high split), making the
    // mandala breathe and bloom with the music rather than a fixed clock.
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.fade.connect(this.analyser);
    this._anaTime = new Uint8Array(this.analyser.fftSize);
    this._anaFreq = new Uint8Array(this.analyser.frequencyBinCount);
    this._level = 0;       // smoothed broadband RMS, 0..1
    this._levLow = 0;      // smoothed low-band energy, 0..1
    this._levHigh = 0;     // smoothed high-band energy, 0..1
    this.lastBell = 0;     // ctx time of the most recent bell strike
    this.lastBellVel = 0;  // its velocity, for ring strength
    this.bellSeq = 0;      // increments each strike so the UI can detect new ones

    this._buildImpulse();
    this._applySpace();
    this._applyGlue();
    this._buildBinaural();

    // ---- meditation bell bus: a clean path straight to master (bypassing the
    // loop compressor + glue) with a small reverb send, so a struck bell rings
    // with the room's space and stays clear over the music.
    this.bellBus = ctx.createGain();
    this.bellBus.gain.value = 1;
    this.bellBus.connect(this.master);
    this.bellBus.connect(this.convolver);

    // ambience bed (vinyl/rain/wind/…) — sits mostly dry under the music,
    // through warmth + compression + master so it obeys volume and sleep fade
    this.textureBus = ctx.createGain();
    this.textureBus.gain.value = this.params.texlevel;
    this.textureBus.connect(this.warm);
    this._activeTex = (this.params.texture || "").split(".").filter(Boolean);

    // any voices generated before the context existed (initial setParams)
    // were not yet routed — point them at the active field gain now.
    for (const v of this.voices) if (!v._out) v._out = this.fieldOut;
  };

  // generated reverb impulse: exponentially-decaying noise
  AmbientEngine.prototype._buildImpulse = function () {
    const ctx = this.ctx;
    const dur = 2.0 + this.params.space * 5.0; // 2..7s tail
    const key = Math.round(dur * 4);
    if (key === this._impulseKey) return;
    this._impulseKey = key;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * dur));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, 2.4);
        // a touch of early-reflection shimmer + smooth tail
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    this.convolver.buffer = buf;
  };

  AmbientEngine.prototype._applySpace = function () {
    const s = this.params.space;
    this.wet.gain.value = 0.12 + s * 0.95;
    this.dry.gain.value = 0.92 - s * 0.32;
  };

  // ---- output compression ("Glue") ----------------------------------
  // one dial sweeps the master compressor from near-transparent to a slow
  // pumping squeeze, with matching makeup gain so loudness stays steady.
  AmbientEngine.prototype._applyGlue = function () {
    if (!this.ctx) return;
    const g = clamp(this.params.glue == null ? 0 : this.params.glue, 0, 1);
    const t = this.ctx.currentTime, ta = 0.05;
    this.comp.threshold.setTargetAtTime(-6 - g * 30, t, ta);   // -6..-36 dB
    this.comp.ratio.setTargetAtTime(1.5 + g * 8, t, ta);       // 1.5..9.5 : 1
    this.comp.attack.setTargetAtTime(0.025 - g * 0.017, t, ta);// 25..8 ms
    this.comp.release.setTargetAtTime(0.22 + g * 0.34, t, ta); // 0.22..0.56 s
    this.compMakeup.gain.setTargetAtTime(1 + g * 0.9, t, ta);  // up to +5 dB
  };

  // ---- binaural beats ------------------------------------------------
  // built once with the master chain; two sines hard-isolated L/R through a
  // channel merger, summed into binBus -> master (dry, bypassing reverb &
  // compression so the perceived beat stays clean). binBus is silent until a
  // band is chosen AND playback is running.
  AmbientEngine.prototype._buildBinaural = function () {
    if (this.binBus) return;
    const ctx = this.ctx;
    this.binMerger = ctx.createChannelMerger(2);
    this.binL = ctx.createOscillator(); this.binL.type = "sine";
    this.binR = ctx.createOscillator(); this.binR.type = "sine";
    this.binLG = ctx.createGain(); this.binLG.gain.value = 0.5;
    this.binRG = ctx.createGain(); this.binRG.gain.value = 0.5;
    this.binL.connect(this.binLG); this.binLG.connect(this.binMerger, 0, 0);
    this.binR.connect(this.binRG); this.binRG.connect(this.binMerger, 0, 1);
    this.binBus = ctx.createGain(); this.binBus.gain.value = 0.0001;
    this.binMerger.connect(this.binBus);
    this.binBus.connect(this.master);
    this._binBand = this.params.binaural || "off";
    this.binL.start(); this.binR.start();
    this._applyBinaural();
  };

  // set the two carrier frequencies for the active band and ramp the level —
  // audible only while a band is on and playback is running
  AmbientEngine.prototype._applyBinaural = function () {
    if (!this.ctx || !this.binBus) return;
    const band = this._binBand || "off";
    const beat = BINAURAL[band] || 0;
    const t = this.ctx.currentTime;
    this.binL.frequency.setTargetAtTime(BIN_CARRIER - beat / 2, t, 0.06);
    this.binR.frequency.setTargetAtTime(BIN_CARRIER + beat / 2, t, 0.06);
    const on = beat > 0 && this.playing;
    const lvl = clamp(this.params.binlevel == null ? 0.4 : this.params.binlevel, 0, 1);
    const target = on ? Math.max(0.0001, lvl * 0.17) : 0.0001;
    this.binBus.gain.setTargetAtTime(target, t, 0.2);
  };

  AmbientEngine.prototype.setBinaural = function (band) {
    if (!(band in BINAURAL)) band = "off";
    this.params.binaural = band;
    this._binBand = band;
    this._applyBinaural();
  };

  AmbientEngine.prototype.setBinLevel = function (v) {
    this.params.binlevel = clamp(v, 0, 1);
    this._applyBinaural();
  };

  // ---- listening volume + sleep fade --------------------------------
  AmbientEngine.prototype.setVolume = function (v) {
    this.userVolume = clamp(v, 0, 1);
    if (this.ctx) this.master.gain.setTargetAtTime(this.userVolume * 0.92, this.ctx.currentTime, 0.03);
  };

  // sample the analyser once per animation frame and update smoothed levels.
  // returns { level, low, high } in 0..1 — cheap enough to call every draw.
  AmbientEngine.prototype.sampleLevels = function () {
    if (!this.ctx || !this.analyser) return { level: 0, low: 0, high: 0 };
    const a = this.analyser;
    a.getByteTimeDomainData(this._anaTime);
    // broadband RMS from the time-domain waveform — catches transients (onsets)
    let sum = 0;
    const td = this._anaTime, N = td.length;
    for (let i = 0; i < N; i++) { const x = (td[i] - 128) / 128; sum += x * x; }
    const rms = Math.sqrt(sum / N);

    // frequency energy — steadier, tracks sustained tone better than RMS alone
    a.getByteFrequencyData(this._anaFreq);
    const fd = this._anaFreq, M = fd.length;
    const split = Math.floor(M * 0.12);
    let lo = 0, hi = 0, all = 0;
    for (let i = 0; i < split; i++) { lo += fd[i]; all += fd[i]; }
    for (let i = split; i < M; i++) { hi += fd[i]; all += fd[i]; }
    lo = lo / (split * 255);
    hi = hi / ((M - split) * 255);
    const mean = all / (M * 255);

    // blend transient RMS with sustained spectral energy for an expressive 0..1
    const lvl = Math.min(1, rms * 4.5 + mean * 1.6);

    // one-pole smoothing so the visuals glide rather than jitter
    this._level += (lvl - this._level) * 0.18;
    this._levLow += (Math.min(1, lo * 1.6) - this._levLow) * 0.16;
    this._levHigh += (Math.min(1, hi * 2.4) - this._levHigh) * 0.2;
    // ride the loudness leveler on the same cadence as the visuals
    this._updateAutoLevel();
    return { level: this._level, low: this._levLow, high: this._levHigh };
  };

  // loudness consistency: measure the (pre-trim) program's spectral energy —
  // steadier than time-domain RMS for sparse, transient material — and glide
  // the leveler gain toward a target so a 4-loop felt piano and a 10-loop
  // orchestra land near the same perceived level. Slow + bounded so it never
  // pumps; holds steady when the program is silent.
  AmbientEngine.prototype._updateAutoLevel = function () {
    if (!this.autoLevel || !this._progAna || !this.levelTrim) return;
    const a = this._progAna, f = this._progFreq;
    a.getByteFrequencyData(f);
    let s = 0; const M = f.length;
    for (let i = 0; i < M; i++) s += f[i];
    const energy = s / (M * 255);            // 0..1 mean spectral energy
    if (energy < 0.003) return;              // silence / startup — hold the trim
    const TARGET = 0.020;                    // perceived-level setpoint (mid of scene range)
    let want = TARGET / energy;
    want = clamp(want, 0.6, 1.7);            // about -4.4 .. +4.6 dB of correction
    this._trim += (want - this._trim) * 0.012; // ~4 s glide at 60fps
    this.levelTrim.gain.setTargetAtTime(this._trim, this.ctx.currentTime, 0.4);
  };

  // ramp the post-master gain down to silence over `seconds` (sleep timer)
  AmbientEngine.prototype.sleepFade = function (seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.exponentialRampToValueAtTime(0.0001, now + Math.max(0.5, seconds));
  };

  // restore full level (sleep cancelled, or before a fresh session)
  AmbientEngine.prototype.cancelFade = function () {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.linearRampToValueAtTime(1, now + 0.4);
  };

  // pre-wake hush: pin the fade gain at silence so the music can start
  // already-inaudible, ready for a slow sunrise rise. Used by the wake timer.
  AmbientEngine.prototype.silenceFade = function () {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0.0001, now);
  };

  // sunrise: ramp the fade gain up from silence to full over `seconds`. The
  // mandala's audio-reactive brightness rises with it, so the visual brightens
  // alongside the sound — the room lighting up at dawn.
  AmbientEngine.prototype.wakeFade = function (seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.exponentialRampToValueAtTime(1, now + Math.max(0.5, seconds));
  };

  // ---- voice (loop) generation --------------------------------------
  // opts.crossfade: when true (and playing), the new field fades in while the
  // current one fades out, instead of swapping instantly — used for scene,
  // mood and ensemble changes so the texture dissolves rather than cuts.
  AmbientEngine.prototype.regenerate = function (opts) {
    opts = opts || {};
    const crossfade = !!(opts.crossfade && this.ctx && this.playing);
    const p = this.params;
    const rng = mulberry32((p.seed >>> 0) ^ (hashMood(p.mood) * 2654435761));
    const mood = MOODS[p.mood] || MOODS.reflection;
    const ensemble = ENSEMBLES[p.ensemble] || ENSEMBLES.piano;
    const instPool = ensemble.pool;
    const n = clamp(Math.round(p.density), 2, 12);

    // register sets the lowest octave; build a 3-octave pool of scale tones
    const base = Math.round(41 + p.register * 19); // F2(41)..C4(60)
    const pool = [];
    for (let oct = 0; oct < 3; oct++) {
      for (const d of mood.notes) {
        const m = base + mood.root + d + 12 * oct;
        if (m <= base + 30) pool.push(m);
      }
    }
    pool.sort(function (a, b) { return a - b; });

    // length spread: tight -> all loops similar; wide -> very unequal
    const spread = p.drift;
    const minP = 9 - spread * 1.0;            // ~8..9s
    const maxP = 14 + spread * 34;            // ~14..48s
    // tempo scales every loop length (exponential; 0.5 = unchanged)
    const paceMult = Math.pow(2, (0.5 - p.tempo) * 2); // slow ~2x .. fast ~0.5x

    const now = this.ctx ? this.ctx.currentTime : 0;
    const voices = [];
    for (let i = 0; i < n; i++) {
      const midi = pool[Math.floor(rng() * pool.length)];
      const inst = instPool[Math.floor(rng() * instPool.length)];
      const norm = clamp((midi - base) / 30, 0, 1); // 0 low .. 1 high
      // lower notes loop slower (longer tape), like a bass drone
      const pscale = 1 + (1 - norm) * 0.45;
      let period = (minP + rng() * (maxP - minP)) * pscale * paceMult;
      // irrational nudge so periods avoid clean ratios -> richer phasing
      period += (rng() - 0.5) * 1.7 + (i % 2 === 0 ? 0.37 : -0.29);
      period = clamp(period, 3.5, 64);

      const phase = rng();                 // 0..1 initial offset
      const startTime = now - phase * period;

      // slow stereo-pan drift (an LFO per voice) -> spatial movement
      const panBase = (rng() * 1.4 - 0.7) * (0.4 + 0.6 * spread);
      const panDepth = (0.16 + rng() * 0.4) * (0.45 + 0.55 * spread);
      const panRate = 0.012 + rng() * 0.032; // Hz (~30..80s sweep)
      const panPhase = rng() * Math.PI * 2;

      voices.push({
        id: i,
        midi: midi,
        inst: inst,
        family: (INSTRUMENTS[inst] || INSTRUMENTS.piano).family,
        freq: midiToFreq(midi, p.tuning),
        name: noteName(midi),
        period: period,
        panBase: panBase, panDepth: panDepth, panRate: panRate, panPhase: panPhase,
        startTime: startTime,
        nextTime: startTime + period,
        viz: { prev: phase, strike: -999, fx: null, nextFx: null },
      });
    }
    voices.sort(function (a, b) { return a.period - b.period; });
    voices.forEach(function (v, idx) { v.row = idx; });

    // remember the scale pool so autonomous drift can re-voice notes later
    this._pool = pool;
    this._base = base;

    // route the new field and seed each voice's first autonomous mutation time
    const ev = this.params.evolve || 0;
    const out = crossfade ? this._newFieldOut() : this.fieldOut;
    for (const v of voices) {
      v._out = out;
      v._mutateAt = now + (24 + rng() * 44) / (0.3 + ev);
    }

    if (crossfade) this._beginCrossfade(out);
    this.voices = voices;
  };

  // a fresh field gain, starting silent, ready to fade up into the bus
  AmbientEngine.prototype._newFieldOut = function () {
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(this.bus);
    return g;
  };

  // park the outgoing field so the scheduler keeps feeding its tails while it
  // fades, then ramp old->0 and new->1 over a slow crossfade
  AmbientEngine.prototype._beginCrossfade = function (newOut) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const FADE = 2.6;
    const old = this.fieldOut;
    if (old) {
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(Math.max(old.gain.value, 0.0001), now);
      old.gain.exponentialRampToValueAtTime(0.0001, now + FADE);
      this._fading.push({ voices: this.voices, out: old, until: now + FADE + 7 });
      const self = this;
      setTimeout(function () { self._cleanupFading(); }, (FADE + 7) * 1000);
    }
    newOut.gain.cancelScheduledValues(now);
    newOut.gain.setValueAtTime(0.0001, now);
    newOut.gain.exponentialRampToValueAtTime(1, now + FADE);
    this.fieldOut = newOut;
  };

  // disconnect any fading fields whose tails have fully decayed
  AmbientEngine.prototype._cleanupFading = function () {
    if (!this._fading || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._fading = this._fading.filter(function (f) {
      if (now >= f.until) { try { f.out.disconnect(); } catch (e) {} return false; }
      return true;
    });
  };

  // ---- ambience bed: synthesized vinyl / rain / wind / static / … -----
  // all textures are generated from filtered noise (and sparse impulse
  // "crackle" buffers) so nothing external is loaded — fully offline.
  AmbientEngine.prototype._noiseBuffer = function () {
    if (this._nb) return this._nb;
    const ctx = this.ctx, rate = ctx.sampleRate, len = rate * 4;
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this._nb = buf;
    return buf;
  };

  // sparse decaying impulses -> the pops & clicks of vinyl / fire
  AmbientEngine.prototype._crackleBuffer = function (seconds, density, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let i = 0;
    while (i < len) {
      i += Math.floor(rate * (0.004 + Math.random() * (1 / density)));
      if (i >= len) break;
      const amp = (Math.random() * 2 - 1) * Math.pow(Math.random(), 2);
      const plen = Math.floor(rate * (0.0005 + Math.random() * 0.003));
      for (let k = 0; k < plen && i + k < len; k++) d[i + k] += amp * Math.pow(1 - k / plen, decay);
    }
    return buf;
  };

  AmbientEngine.prototype._noiseSource = function () {
    const s = this.ctx.createBufferSource();
    s.buffer = this._noiseBuffer();
    s.loop = true;
    return s;
  };

  // brown ("red") noise: integrated white -> -6dB/oct, a deep soft rush.
  // built by a leaky random walk, normalized so it loops without a seam click.
  AmbientEngine.prototype._brownBuffer = function () {
    if (this._bb) return this._bb;
    const ctx = this.ctx, rate = ctx.sampleRate, len = rate * 6;
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
      // taper the last 1024 samples toward the first to mask the loop join
      const tail = 1024;
      for (let i = 0; i < tail; i++) {
        const t = i / tail;
        d[len - tail + i] = d[len - tail + i] * t + d[0] * (1 - t);
      }
    }
    this._bb = buf;
    return buf;
  };

  AmbientEngine.prototype._brownSource = function () {
    const s = this.ctx.createBufferSource();
    s.buffer = this._brownBuffer();
    s.loop = true;
    return s;
  };

  // pink noise: -3dB/oct, the most "natural" balance (between white & brown).
  // Paul Kellet's filtered-white approximation, with a loop-seam taper.
  AmbientEngine.prototype._pinkBuffer = function () {
    if (this._pb) return this._pb;
    const ctx = this.ctx, rate = ctx.sampleRate, len = rate * 6;
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      const tail = 1024;
      for (let i = 0; i < tail; i++) {
        const t = i / tail;
        d[len - tail + i] = d[len - tail + i] * t + d[0] * (1 - t);
      }
    }
    this._pb = buf;
    return buf;
  };

  AmbientEngine.prototype._pinkSource = function () {
    const s = this.ctx.createBufferSource();
    s.buffer = this._pinkBuffer();
    s.loop = true;
    return s;
  };

  // build one texture's node graph; returns { out, sources } so it can be
  // faded and torn down cleanly. signal path:
  //   internal nodes -> out (fade gain) -> swell (slow LFO) -> pan (drift) -> bus
  AmbientEngine.prototype._makeTexture = function (id) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    const sources = [];
    const startAll = (now) => sources.forEach((s) => s.start(now));
    const now = ctx.currentTime;

    const noise = () => { const s = this._noiseSource(); sources.push(s); return s; };
    const bp = (f, q) => { const n = ctx.createBiquadFilter(); n.type = "bandpass"; n.frequency.value = f; n.Q.value = q || 0.7; return n; };
    const lp = (f) => { const n = ctx.createBiquadFilter(); n.type = "lowpass"; n.frequency.value = f; return n; };
    const hp = (f) => { const n = ctx.createBiquadFilter(); n.type = "highpass"; n.frequency.value = f; return n; };
    const gain = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const lfo = (rate, depth, target, base) => {
      const o = ctx.createOscillator(); o.frequency.value = rate;
      const g = ctx.createGain(); g.gain.value = depth;
      o.connect(g); g.connect(target);
      if (base != null) target.value = base;
      sources.push(o);
      return o;
    };

    if (id === "vinyl") {
      // surface hiss
      const h = noise(); const hP = hp(700); const hL = lp(5200); const hG = gain(0.05);
      h.connect(hP); hP.connect(hL); hL.connect(hG); hG.connect(out);
      // pops & clicks
      const cs = ctx.createBufferSource(); cs.buffer = this._crackleBuffer(6, 11, 1.1); cs.loop = true; sources.push(cs);
      const cL = lp(4200); const cG = gain(0.55); cs.connect(cL); cL.connect(cG); cG.connect(out);
      // low turntable rumble
      const r = noise(); const rL = lp(58); const rG = gain(0.12); r.connect(rL); rL.connect(rG); rG.connect(out);
    } else if (id === "rain") {
      const s = noise(); const b = bp(1700, 0.7); const l = lp(6500); const g = gain(0.14);
      s.connect(b); b.connect(l); l.connect(g); g.connect(out);
      lfo(0.08, 0.05, g.gain, 0.13); // gusts
      const s2 = noise(); const b2 = bp(5200, 0.5); const g2 = gain(0.05);
      s2.connect(b2); b2.connect(g2); g2.connect(out);
    } else if (id === "wind") {
      const s = noise(); const l = lp(540); const g = gain(0.13);
      s.connect(l); l.connect(g); g.connect(out);
      lfo(0.06, 360, l.frequency, 560);  // cutoff sweep
      lfo(0.045, 0.075, g.gain, 0.1);     // amplitude swell
      const s2 = noise(); const b = bp(420, 4.5); const g2 = gain(0.05);
      s2.connect(b); b.connect(g2); g2.connect(out);
      lfo(0.05, 260, b.frequency, 520);   // howl
    } else if (id === "static") {
      const s = noise(); const h = hp(900); const b = bp(2600, 0.6); const g = gain(0.07);
      s.connect(h); h.connect(b); b.connect(g); g.connect(out);
    } else if (id === "tape") {
      const s = noise(); const h = hp(3600); const g = gain(0.045);
      s.connect(h); h.connect(g); g.connect(out);
    } else if (id === "white") {
      // flat broadband hiss, gently tamed up top so it soothes rather than bites
      const s = noise(); const l = lp(11000); const g = gain(0.055);
      s.connect(l); l.connect(g); g.connect(out);
    } else if (id === "pink") {
      // balanced, natural rush — softer than white, airier than brown
      const p = this._pinkSource(); sources.push(p);
      const l = lp(8000); const g = gain(0.10);
      p.connect(l); l.connect(g); g.connect(out);
    } else if (id === "brown") {
      // deep, soft rush — the "waterfall" bed; a touch of lowpass rounds it
      const b = this._brownSource(); sources.push(b);
      const l = lp(2200); const g = gain(0.16);
      b.connect(l); l.connect(g); g.connect(out);
    } else if (id === "fire") {
      const s = noise(); const l = lp(680); const g = gain(0.1);
      s.connect(l); l.connect(g); g.connect(out);
      lfo(0.07, 0.04, g.gain, 0.09);      // breathing roar
      const cs = ctx.createBufferSource(); cs.buffer = this._crackleBuffer(5, 22, 1.7); cs.loop = true; sources.push(cs);
      const cL = lp(3000); const cG = gain(0.42); cs.connect(cL); cL.connect(cG); cG.connect(out);
    } else {
      return null;
    }

    // ---- gentle weather: swell the level and drift across the stereo field
    // so the bed never sits perfectly still. Two incommensurate LFOs per
    // parameter -> the motion never settles into an audible loop. Per-texture
    // tuning: how deep it breathes, how far/fast it drifts L<->R.
    const M = {
      rain:   { sDepth: 0.20, sRate: 0.045, pDepth: 0.55, pRate: 0.028 },
      wind:   { sDepth: 0.30, sRate: 0.055, pDepth: 0.70, pRate: 0.022 },
      fire:   { sDepth: 0.16, sRate: 0.070, pDepth: 0.30, pRate: 0.040 },
      vinyl:  { sDepth: 0.07, sRate: 0.050, pDepth: 0.10, pRate: 0.030 },
      static: { sDepth: 0.12, sRate: 0.060, pDepth: 0.22, pRate: 0.045 },
      tape:   { sDepth: 0.10, sRate: 0.040, pDepth: 0.16, pRate: 0.035 },
      white:  { sDepth: 0.09, sRate: 0.048, pDepth: 0.16, pRate: 0.038 },
      pink:   { sDepth: 0.10, sRate: 0.045, pDepth: 0.18, pRate: 0.034 },
      brown:  { sDepth: 0.13, sRate: 0.042, pDepth: 0.20, pRate: 0.030 },
    }[id] || { sDepth: 0.16, sRate: 0.05, pDepth: 0.4, pRate: 0.03 };

    const swell = ctx.createGain();
    const base = 1 - M.sDepth; // peak stays at ~1 so nothing clips the bed
    swell.gain.value = base;
    lfo(M.sRate, M.sDepth * 0.7, swell.gain, base);            // primary breath
    lfo(M.sRate * 1.7 + 0.011, M.sDepth * 0.3, swell.gain);    // secondary ripple

    const pan = ctx.createStereoPanner();
    pan.pan.value = 0;
    lfo(M.pRate, M.pDepth * 0.7, pan.pan, 0);                  // slow traverse
    lfo(M.pRate * 1.9 + 0.007, M.pDepth * 0.3, pan.pan);       // wander on top

    out.connect(swell); swell.connect(pan); pan.connect(this.textureBus);

    startAll(now);
    return { out: out, sources: sources };
  };

  AmbientEngine.prototype.startTexture = function (id) {
    if (!this.ctx || this._textures[id]) return;
    const h = this._makeTexture(id);
    if (!h) return;
    const now = this.ctx.currentTime;
    h.out.gain.cancelScheduledValues(now);
    h.out.gain.setValueAtTime(0.0001, now);
    h.out.gain.exponentialRampToValueAtTime(1, now + 1.3);
    this._textures[id] = h;
  };

  AmbientEngine.prototype.stopTexture = function (id) {
    const h = this._textures[id];
    if (!h) return;
    delete this._textures[id];
    const now = this.ctx.currentTime;
    h.out.gain.cancelScheduledValues(now);
    h.out.gain.setValueAtTime(Math.max(h.out.gain.value, 0.0001), now);
    h.out.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(function () {
      h.sources.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} });
      try { h.out.disconnect(); } catch (e) {}
    }, 1000);
  };

  // diff the requested texture set against what's playing (live)
  AmbientEngine.prototype.setTextures = function (ids) {
    ids = ids || [];
    this._activeTex = ids.slice();
    this.params.texture = ids.join(".");
    if (!this.ctx || !this.playing) return;
    for (const id of ids) this.startTexture(id);
    for (const id in this._textures) if (ids.indexOf(id) < 0) this.stopTexture(id);
  };

  AmbientEngine.prototype.setTextureLevel = function (v) {
    this.params.texlevel = clamp(v, 0, 1);
    if (this.ctx) this.textureBus.gain.setTargetAtTime(this.params.texlevel, this.ctx.currentTime, 0.05);
  };

  // generative loop (music) level — rides only the loop field, leaving the
  // ambience bed and binaural tones untouched
  AmbientEngine.prototype.setLoopLevel = function (v) {
    this.params.looplevel = clamp(v, 0, 1);
    if (this.ctx) this.loopGain.gain.setTargetAtTime(this.params.looplevel, this.ctx.currentTime, 0.04);
  };

  AmbientEngine.prototype._startActiveTextures = function () {
    for (const id of this._activeTex) this.startTexture(id);
  };
  AmbientEngine.prototype._stopAllTextures = function () {
    for (const id in this._textures) this.stopTexture(id);
  };

  // ---- felt-piano voice ---------------------------------------------
  AmbientEngine.prototype.panAt = function (v, t) {
    return clamp(v.panBase + v.panDepth * Math.sin(2 * Math.PI * v.panRate * t + v.panPhase), -1, 1);
  };

  AmbientEngine.prototype.playVoice = function (v, time, opts) {
    const inst = INSTRUMENTS[v.inst] || INSTRUMENTS.piano;
    if (inst.sustained) this._synthSustained(v, time, opts || {}, inst);
    else this._synthStruck(v, time, opts || {}, inst);
  };

  // struck/plucked: percussive attack, exponential ring (piano, bell, marimba, harp)
  AmbientEngine.prototype._synthStruck = function (v, time, opts, inst) {
    const ctx = this.ctx;
    const color = this._effColor();
    const detune = opts.detune || 0;
    const freq = v.freq * Math.pow(2, detune / 1200);
    const norm = clamp((v.midi - 36) / 48, 0, 1);
    const decay = clamp(inst.decayLow + (inst.decayHigh - inst.decayLow) * norm, 0.4, 11)
      * (opts.durScale == null ? 1 : opts.durScale);
    const onset = time + (Math.random() - 0.5) * 0.012;
    const vel = (opts.vel == null ? 1 : opts.vel) * inst.gain;

    const g = ctx.createGain();
    const peak = 0.15 * vel * (0.78 + Math.random() * 0.22);
    g.gain.setValueAtTime(0.0001, onset);
    g.gain.linearRampToValueAtTime(peak, onset + inst.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, onset + decay);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    const cut = inst.cutBase + color * inst.cutColor;
    lp.frequency.setValueAtTime(cut * 1.7, onset);
    lp.frequency.exponentialRampToValueAtTime(clamp(cut * inst.cutTrack, 250, 9000), onset + 1.6);
    lp.Q.value = 0.5;

    const carriers = [];
    for (let k = 0; k < inst.partials.length; k++) {
      const o = ctx.createOscillator();
      o.type = inst.wave;
      o.frequency.value = freq * inst.partials[k][0];
      const og = ctx.createGain();
      og.gain.value = inst.partials[k][1];
      o.connect(og); og.connect(lp);
      o.start(onset);
      o.stop(onset + decay + 0.25);
      carriers.push(o);
    }

    // ---- Bloom: FM shimmer. A modulator at the octave injects bright,
    // bell-like sidebands at the attack that decay quickly into a pure tail.
    // Higher bloom -> deeper index -> the sidebands beat and "collide".
    const bloom = this._effBloom();
    if (bloom > 0.001) {
      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.value = freq * 2.0;
      const mg = ctx.createGain();
      const idx = bloom * freq * 6;
      mg.gain.setValueAtTime(idx, onset);
      mg.gain.exponentialRampToValueAtTime(Math.max(0.0001, idx * 0.05), onset + Math.min(decay, 1.6));
      mod.connect(mg);
      for (let k = 0; k < carriers.length; k++) mg.connect(carriers[k].frequency);
      mod.start(onset);
      mod.stop(onset + decay + 0.25);
    }

    if (inst.hammer > 0) {
      const nlen = Math.floor(ctx.sampleRate * 0.05);
      const nbuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
      const ndata = nbuf.getChannelData(0);
      for (let i = 0; i < nlen; i++) ndata[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nlen, 3);
      const nsrc = ctx.createBufferSource();
      nsrc.buffer = nbuf;
      const nbp = ctx.createBiquadFilter();
      nbp.type = "bandpass";
      nbp.frequency.value = clamp(freq * 2.2, 200, 3500);
      nbp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = inst.hammer * vel * (0.4 + color);
      nsrc.connect(nbp); nbp.connect(ng); ng.connect(g);
      nsrc.start(onset); nsrc.stop(onset + 0.06);
    }

    lp.connect(g);
    this._panOut(v, g, onset, decay);
  };

  // sustained/bowed: slow swell that breathes within the loop (strings, choir, flute, drone)
  AmbientEngine.prototype._synthSustained = function (v, time, opts, inst) {
    const ctx = this.ctx;
    const color = this._effColor();
    const detuneCents = opts.detune || 0;
    const freq = v.freq * Math.pow(2, detuneCents / 1200);
    const dur = clamp(Math.min(v.period * 0.92, 16), 2, 16)
      * (opts.durScale == null ? 1 : opts.durScale);
    const onset = time;
    const vel = (opts.vel == null ? 1 : opts.vel) * inst.gain;
    const atk = dur * inst.swellAtk;
    const rel = dur * inst.swellRel;

    const g = ctx.createGain();
    const peak = 0.12 * vel;
    g.gain.setValueAtTime(0.0001, onset);
    g.gain.linearRampToValueAtTime(peak, onset + atk);
    g.gain.setValueAtTime(peak, Math.max(onset + atk, onset + dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, onset + dur);

    // tone shaping: formant bank (choir) or single lowpass
    let toneIn;
    if (inst.formant) {
      toneIn = ctx.createGain();
      for (let f = 0; f < inst.formant.length; f++) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = inst.formant[f][0];
        bp.Q.value = 6;
        const fg = ctx.createGain();
        fg.gain.value = inst.formant[f][1];
        toneIn.connect(bp); bp.connect(fg); fg.connect(g);
      }
    } else {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = clamp(inst.cutBase + color * inst.cutColor, 300, 9000);
      lp.Q.value = 0.6;
      lp.connect(g);
      toneIn = lp;
    }

    // shared vibrato LFO -> oscillator detune
    let vib = null, vibGain = null;
    if (inst.vibrato) {
      vib = ctx.createOscillator();
      vib.frequency.value = inst.vibrato.rate;
      vibGain = ctx.createGain();
      vibGain.gain.value = inst.vibrato.depth; // cents
      vib.connect(vibGain);
      vib.start(onset);
      vib.stop(onset + dur + 0.1);
    }

    const nv = inst.oscVoices || 1;
    const carriers = [];
    for (let k = 0; k < nv; k++) {
      const det = nv > 1 ? (k - (nv - 1) / 2) * inst.detune : 0;
      for (let pI = 0; pI < inst.partials.length; pI++) {
        const o = ctx.createOscillator();
        o.type = inst.wave;
        o.frequency.value = freq * inst.partials[pI][0];
        o.detune.value = det;
        if (vibGain) vibGain.connect(o.detune);
        const og = ctx.createGain();
        og.gain.value = inst.partials[pI][1] / nv;
        o.connect(og); og.connect(toneIn);
        o.start(onset);
        o.stop(onset + dur + 0.1);
        carriers.push(o);
      }
    }

    // ---- Bloom: a gentler, breathing FM for pads — the shimmer swells in
    // and out with the note rather than striking, evolving the timbre.
    const bloom = this._effBloom();
    if (bloom > 0.001) {
      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.value = freq * 2.0;
      const mg = ctx.createGain();
      const idx = bloom * freq * 2.6;
      mg.gain.setValueAtTime(0.0001, onset);
      mg.gain.linearRampToValueAtTime(idx, onset + atk);
      mg.gain.setValueAtTime(idx, Math.max(onset + atk, onset + dur - rel));
      mg.gain.exponentialRampToValueAtTime(0.0001, onset + dur);
      mod.connect(mg);
      for (let k = 0; k < carriers.length; k++) mg.connect(carriers[k].frequency);
      mod.start(onset);
      mod.stop(onset + dur + 0.1);
    }

    // breath noise (flute/choir air)
    if (inst.breath > 0) {
      const blen = Math.floor(ctx.sampleRate * Math.min(dur, 6));
      const bbuf = ctx.createBuffer(1, blen, ctx.sampleRate);
      const bd = bbuf.getChannelData(0);
      for (let i = 0; i < blen; i++) bd[i] = (Math.random() * 2 - 1);
      const bsrc = ctx.createBufferSource();
      bsrc.buffer = bbuf; bsrc.loop = true;
      const bbp = ctx.createBiquadFilter();
      bbp.type = "bandpass"; bbp.frequency.value = clamp(freq * 2, 600, 4000); bbp.Q.value = 0.8;
      const bg = ctx.createGain();
      bg.gain.value = 0;
      bg.gain.setValueAtTime(0.0001, onset);
      bg.gain.linearRampToValueAtTime(inst.breath * vel, onset + atk);
      bg.gain.exponentialRampToValueAtTime(0.0001, onset + dur);
      bsrc.connect(bbp); bbp.connect(bg); bg.connect(g);
      bsrc.start(onset); bsrc.stop(onset + dur + 0.1);
    }

    this._panOut(v, g, onset, dur);
  };

  // stereo placement that drifts slowly and travels across the note's life
  AmbientEngine.prototype._panOut = function (v, node, onset, span) {
    const pan = this.ctx.createStereoPanner();
    pan.pan.setValueAtTime(this.panAt(v, onset), onset);
    pan.pan.linearRampToValueAtTime(this.panAt(v, onset + span), onset + span);
    node.connect(pan);
    pan.connect(v._out || this.fieldOut || this.bus);
  };

  // ---- autonomous drift ---------------------------------------------
  // effective (drifting) timbre values read live by the synths
  AmbientEngine.prototype._effColor = function () {
    return clamp(this.params.color + this._evo.color, 0, 1);
  };
  AmbientEngine.prototype._effBloom = function () {
    return clamp((this.params.bloom || 0) + this._evo.bloom, 0, 1);
  };

  // random tape-stutter: a quick accelerating burst of retriggers
  AmbientEngine.prototype.playStutter = function (v, time) {
    const intensity = this.params.stutter;
    const n = 3 + Math.floor(Math.random() * (2 + intensity * 4));
    let t = time;
    let gap = 0.05 + Math.random() * 0.07;
    for (let i = 0; i < n; i++) {
      this.playVoice(v, t, {
        vel: 0.9 * Math.pow(0.8, i),
        durScale: i === n - 1 ? 1 : 0.45,
        detune: i * 11,              // slight rising shimmer
      });
      t += gap;
      gap *= 0.86;                   // accelerate
    }
  };

  // ---- scheduler -----------------------------------------------------
  AmbientEngine.prototype._tick = function () {
    if (!this.playing) return;
    const ctx = this.ctx;
    this._evolveStep(ctx.currentTime);
    this._journeyTick(ctx.currentTime);
    this._scheduleVoices(this.voices, ctx);
    // keep feeding the tails of any fields currently fading out
    if (this._fading) for (let f = 0; f < this._fading.length; f++) {
      this._scheduleVoices(this._fading[f].voices, ctx);
    }
  };

  AmbientEngine.prototype._scheduleVoices = function (voices, ctx) {
    // virtual clock during offline render; real clock when playing live
    const cur = this._vnow != null ? this._vnow : ctx.currentTime;
    const horizon = cur + this.lookahead;
    const minTime = cur - 0.02;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      // keep nextTime on the startTime grid so visuals stay aligned
      let guard = 0;
      while (v.nextTime < horizon && guard < 64) {
        if (v.nextTime >= minTime) {
          if (Math.random() < this.params.stutter * 0.22) {
            this.playStutter(v, v.nextTime);
            v.viz.nextFx = "stutter";
          } else {
            this.playVoice(v, v.nextTime);
            v.viz.nextFx = null;
          }
        }
        v.nextTime += v.period;
        guard++;
      }
    }
  };

  // ---- autonomous slow drift ----------------------------------------
  // Over a long listen the field should never settle into a loop. Two layers:
  //  (1) continuous: timbre (color/bloom) wanders on slow irrational LFOs.
  //  (2) structural: each voice, on its own slow clock, re-voices to a nearby
  //      scale tone, nudges its loop length (phase-continuous) and re-aims its
  //      stereo drift. Changes land between strikes, so they're seamless.
  AmbientEngine.prototype._evolveStep = function (now) {
    const e = this.params.evolve || 0;
    // continuous timbral wander (sum of incommensurate sines -> non-repeating)
    const s1 = Math.sin(now * 0.0123) + 0.6 * Math.sin(now * 0.00701 + 1.3);
    const s2 = Math.sin(now * 0.0091 + 2.1) + 0.5 * Math.sin(now * 0.00503 + 0.7);
    this._evo.color = e * 0.16 * (s1 / 1.6);
    this._evo.bloom = e * 0.14 * (s2 / 1.5);
    if (e <= 0.001) return;

    const pool = this._pool;
    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      if (v._mutateAt == null) { v._mutateAt = now + 40; continue; }
      if (now < v._mutateAt) continue;

      // re-voice: step to a neighbouring scale tone (smooth voice-leading),
      // occasionally leap further for a fresh colour
      if (pool && pool.length) {
        const idx = pool.indexOf(v.midi);
        let nidx;
        if (idx >= 0 && Math.random() < 0.78) {
          const step = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
          nidx = clamp(idx + step, 0, pool.length - 1);
        } else {
          nidx = Math.floor(Math.random() * pool.length);
        }
        const nm = pool[nidx];
        v.midi = nm; v.freq = midiToFreq(nm, this.params.tuning); v.name = noteName(nm);
      }

      // nudge the loop length, rebased so the playhead phase stays continuous
      if (Math.random() < 0.55) {
        const ph = (((now - v.startTime) % v.period) + v.period) % v.period / v.period;
        let np = clamp(v.period * (1 + (Math.random() - 0.5) * 0.16), 3.5, 64);
        v.period = np;
        v.startTime = now - ph * np;
        v.nextTime = v.startTime + np;
        while (v.nextTime <= now) v.nextTime += np;
      }

      // re-aim the slow stereo drift (continuous functions -> no click)
      v.panBase = clamp(v.panBase + (Math.random() - 0.5) * 0.24, -0.85, 0.85);
      v.panRate = clamp(v.panRate * (1 + (Math.random() - 0.5) * 0.25), 0.008, 0.06);

      // schedule the next mutation; more evolve -> sooner, but always slow
      v._mutateAt = now + (24 + Math.random() * 44) / (0.3 + e);
    }
  };

  // ---- journey mode: autonomous mood migration ----------------------
  // every few minutes (pace set by params.journey) the field crossfades to a
  // new mood, with a gentle nudge to register & colour, so a long listen
  // travels through harmonic "places" rather than holding one. Evolve handles
  // the micro-variation within each; Journey handles the macro-arc.
  AmbientEngine.prototype._journeyTick = function (now) {
    const j = this.params.journey || 0;
    if (j <= 0.001) { this._journeyNext = 0; return; }
    if (!this._journeyNext) { this._journeyNext = now + this._journeySpan(j); return; }
    if (now >= this._journeyNext) this._journeyStep(now);
  };

  AmbientEngine.prototype._journeySpan = function (j) {
    // ~4 min at the gentlest, ~70s at the most roaming (with a little jitter)
    return (255 - j * 185) * (0.85 + Math.random() * 0.3);
  };

  AmbientEngine.prototype._journeyStep = function (now) {
    const order = MOOD_ORDER;
    const cur = this.params.mood;
    let next = cur, guard = 0;
    while (next === cur && guard++ < 12) next = order[Math.floor(Math.random() * order.length)];
    this.params.mood = next;
    // drift the surrounding world a touch (colour is live; register recomposes)
    this.params.color = clamp(this.params.color + (Math.random() - 0.5) * 0.18, 0, 1);
    this.params.register = clamp(this.params.register + (Math.random() - 0.5) * 0.16, 0.08, 0.95);
    this.regenerate({ crossfade: true });
    this._journeyNext = now + this._journeySpan(this.params.journey || 0);
    if (this.onJourney) this.onJourney({
      mood: next, color: this.params.color, register: this.params.register,
    });
  };

  AmbientEngine.prototype.play = function () {
    this.ensureContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.voices.length) this.regenerate();
    else this._rebase();
    // make sure the active field is at full level (e.g. resuming mid-crossfade)
    if (this.fieldOut) {
      const now = this.ctx.currentTime;
      this.fieldOut.gain.cancelScheduledValues(now);
      this.fieldOut.gain.setValueAtTime(1, now);
    }
    // restore the loop + ambience levels in case a session close ducked them
    if (this.loopGain) {
      const lv = this.params.looplevel == null ? 1 : this.params.looplevel;
      this.loopGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.loopGain.gain.setValueAtTime(lv, this.ctx.currentTime);
    }
    if (this.textureBus) {
      this.textureBus.gain.cancelScheduledValues(this.ctx.currentTime);
      this.textureBus.gain.setValueAtTime(this.params.texlevel, this.ctx.currentTime);
    }
    this.playing = true;
    const self = this;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(function () { self._tick(); }, this.tickMs);
    this._startActiveTextures();
    this._applyBinaural(); // resume the beat if a band is active
    this._journeyNext = 0; // reschedule the next move fresh from now
    this._tick();
  };

  // ---- offline render ------------------------------------------------
  // Render the *current* drift to a finished AudioBuffer, faster than real
  // time. A throwaway engine instance is built on an OfflineAudioContext, the
  // same deterministic field is regenerated, and the scheduler is driven by a
  // virtual clock across the whole clip — so the phase-drift, reverb, glue,
  // ambience and binaural all print exactly as they sound live.
  AmbientEngine.prototype.renderOffline = function (opts) {
    opts = opts || {};
    const seconds = Math.max(5, opts.seconds || 120);
    const tail = 6;                       // let reverb + final notes ring out
    const sr = opts.sampleRate || 44100;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error("offline audio unsupported"));
    const octx = new OAC(2, Math.ceil(sr * (seconds + tail)), sr);

    const r = new AmbientEngine();
    r.params = Object.assign({}, this.params, opts.params || {});
    r.userVolume = (opts.userVolume == null ? this.userVolume : opts.userVolume);
    r.ensureContext(octx);                // build the full graph on the offline ctx
    r.autoLevel = false;                  // freeze the leveler at the live trim
    if (r.levelTrim) r.levelTrim.gain.value = (opts.trim == null ? (this._trim || 1) : opts.trim);
    r.playing = true;                     // so binaural enables during the print
    r.regenerate({ crossfade: false });   // same seed+params -> same field as live
    r._startActiveTextures();
    r._applyBinaural();

    // virtual scheduling: advance a fake clock across the clip one lookahead
    // window at a time, scheduling every voice exactly as the live tick would
    const step = r.lookahead;
    for (let vt = 0; vt <= seconds; vt += step) {
      r._vnow = vt;
      r._scheduleVoices(r.voices, octx);
    }
    r._vnow = null;

    return octx.startRendering();
  };

  // encode an AudioBuffer to a 16-bit PCM WAV Blob (no dependencies)
  AmbientEngine.bufferToWav = function (buf) {
    const numCh = buf.numberOfChannels;
    const sr = buf.sampleRate;
    const frames = buf.length;
    const chans = [];
    for (let c = 0; c < numCh; c++) chans.push(buf.getChannelData(c));

    const bytesPerSample = 2;
    const blockAlign = numCh * bytesPerSample;
    const dataLen = frames * blockAlign;
    const ab = new ArrayBuffer(44 + dataLen);
    const dv = new DataView(ab);
    const wStr = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };

    wStr(0, "RIFF");
    dv.setUint32(4, 36 + dataLen, true);
    wStr(8, "WAVE");
    wStr(12, "fmt ");
    dv.setUint32(16, 16, true);           // PCM chunk size
    dv.setUint16(20, 1, true);            // format = PCM
    dv.setUint16(22, numCh, true);
    dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * blockAlign, true);
    dv.setUint16(32, blockAlign, true);
    dv.setUint16(34, 16, true);           // bits per sample
    wStr(36, "data");
    dv.setUint32(40, dataLen, true);

    let off = 44;
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < numCh; c++) {
        let s = chans[c][i];
        s = s < -1 ? -1 : s > 1 ? 1 : s;  // clamp
        dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        off += 2;
      }
    }
    return new Blob([ab], { type: "audio/wav" });
  };

  AmbientEngine.prototype.pause = function () {
    this.playing = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._stopAllTextures();
    this._applyBinaural(); // silence the beat while paused
    // drop any in-flight crossfade tails so a later resume starts clean
    if (this._fading && this._fading.length) {
      for (let i = 0; i < this._fading.length; i++) {
        try { this._fading[i].out.disconnect(); } catch (e) {}
      }
      this._fading = [];
    }
  };

  // re-anchor loop grids to "now" (used when resuming) without resetting phase feel
  AmbientEngine.prototype._rebase = function () {
    const now = this.ctx.currentTime;
    for (const v of this.voices) {
      const ph = ((now - v.startTime) % v.period + v.period) % v.period;
      v.startTime = now - ph;
      v.nextTime = v.startTime + v.period;
    }
  };

  // ---- meditation bell ----------------------------------------------
  // a singing-bowl strike, pitched from the current mood's root so it stays
  // consonant with the field. Rings through the dedicated clean bell bus, so
  // it speaks clearly over (or after) the music. opts: octave, vel, decay, delay.
  AmbientEngine.prototype.strikeBell = function (opts) {
    this.ensureContext();
    if (this.ctx.state === "suspended") { const r = this.ctx.resume(); if (r && r.catch) r.catch(function () {}); }
    opts = opts || {};
    const ctx = this.ctx;
    const now = ctx.currentTime + (opts.delay || 0);
    const mood = MOODS[this.params.mood] || MOODS.reflection;
    const midi = (opts.midi != null) ? opts.midi : (53 + mood.root + (opts.octave || 0) * 12);
    const f = midiToFreq(midi, this.params.tuning);
    const decay = opts.decay || 9;
    const vel = (opts.vel == null ? 1 : opts.vel);
    // record the strike so the mandala can ring the whole field in response
    this.lastBell = now;
    this.lastBellVel = vel;
    this.bellSeq++;

    const g = ctx.createGain();
    const peak = 0.26 * vel;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 4600; lp.Q.value = 0.4;
    lp.connect(g);
    g.connect(this.bellBus || this.master);

    // inharmonic bowl partials -> metallic shimmer with a long, settling tail
    const partials = [[1, 1], [2.0, 0.4], [2.78, 0.5], [3.5, 0.22], [5.4, 0.13], [6.7, 0.06]];
    for (let k = 0; k < partials.length; k++) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * partials[k][0];
      const og = ctx.createGain();
      og.gain.setValueAtTime(partials[k][1], now);
      // higher partials shed faster, so the tone purifies toward the fundamental
      og.gain.exponentialRampToValueAtTime(Math.max(0.0001, partials[k][1] * 0.04), now + decay * (0.45 + 0.55 / partials[k][0]));
      o.connect(og); og.connect(lp);
      o.start(now); o.stop(now + decay + 0.3);
    }

    // soft mallet contact at the strike
    const nlen = Math.floor(ctx.sampleRate * 0.04);
    const nbuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nlen, 3);
    const ns = ctx.createBufferSource(); ns.buffer = nbuf;
    const nbp = ctx.createBiquadFilter(); nbp.type = "bandpass"; nbp.frequency.value = clamp(f * 3, 300, 4200); nbp.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.06 * vel;
    ns.connect(nbp); nbp.connect(ng); ng.connect(this.bellBus || this.master);
    ns.start(now); ns.stop(now + 0.05);
  };

  // fade the musical field + ambience + beats to silence over `seconds`,
  // leaving the bell bus untouched so a closing bell rings on over the hush.
  AmbientEngine.prototype.duckField = function (seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, s = Math.max(0.5, seconds || 6);
    const ramp = (param) => {
      param.cancelScheduledValues(now);
      param.setValueAtTime(Math.max(param.value, 0.0001), now);
      param.exponentialRampToValueAtTime(0.0001, now + s);
    };
    if (this.loopGain) ramp(this.loopGain.gain);
    if (this.textureBus) ramp(this.textureBus.gain);
    if (this.binBus) ramp(this.binBus.gain);
  };

  // ---- live parameter updates ---------------------------------------
  // returns which subsystem changed so the UI can decide on transitions
  AmbientEngine.prototype.set = function (key, value) {
    const p = this.params;
    if (p[key] === value) return;
    p[key] = value;
    if (key === "space") {
      if (this.ctx) { this._buildImpulse(); this._applySpace(); }
      return;
    }
    if (key === "color" || key === "stutter" || key === "bloom" || key === "evolve") return; // read live
    if (key === "glue") { this._applyGlue(); return; }
    if (key === "tuning") {
      // retune the whole field live — subsequent strikes pick up the new
      // reference; held notes shift on their next loop. No regenerate needed.
      for (const v of this.voices) v.freq = midiToFreq(v.midi, value);
      if (this._fading) for (const f of this._fading)
        for (const v of f.voices) v.freq = midiToFreq(v.midi, value);
      return;
    }
    if (key === "binaural") { this.setBinaural(value); return; }
    if (key === "binlevel") { this.setBinLevel(value); return; }
    if (key === "journey") { this._journeyNext = 0; return; }       // (re)arm timer
    if (key === "texlevel") { this.setTextureLevel(value); return; }
    if (key === "looplevel") { this.setLoopLevel(value); return; }
    if (key === "texture") { this.setTextures(value ? value.split(".").filter(Boolean) : []); return; }
    // mood / ensemble swap the whole palette -> dissolve across a crossfade;
    // density/tempo/drift/register/seed stay instant so dials feel responsive
    const cross = (key === "mood" || key === "ensemble");
    this.regenerate({ crossfade: cross });
  };

  AmbientEngine.prototype.setParams = function (obj) {
    for (const k in obj) this.params[k] = obj[k];
    if (this.ctx) { this._buildImpulse(); this._applySpace(); }
    // side-effects that param assignment alone doesn't trigger:
    if ("texlevel" in obj) this.setTextureLevel(this.params.texlevel);
    if ("looplevel" in obj) this.setLoopLevel(this.params.looplevel);
    if ("texture" in obj) this.setTextures(this.params.texture ? this.params.texture.split(".").filter(Boolean) : []);
    if ("glue" in obj) this._applyGlue();
    if ("binaural" in obj) { this._binBand = this.params.binaural; this._applyBinaural(); }
    if ("binlevel" in obj) this._applyBinaural();
    if ("journey" in obj) this._journeyNext = 0; // re-arm the journey timer
    // scenes change everything at once — crossfade when already playing
    this.regenerate({ crossfade: !!(this.ctx && this.playing) });
  };

  // current cycle progress 0..1 for a voice (for the playhead)
  AmbientEngine.prototype.progress = function (v) {
    if (!this.ctx) return v.viz.prev || 0;
    const now = this.ctx.currentTime;
    return (((now - v.startTime) % v.period) + v.period) % v.period / v.period;
  };

  // ---- helpers -------------------------------------------------------
  const NAMES = ["C", "C\u266f", "D", "D\u266f", "E", "F", "F\u266f", "G", "G\u266f", "A", "A\u266f", "B"];
  function noteName(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function hashMood(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }

  window.AmbientEngine = AmbientEngine;
})();

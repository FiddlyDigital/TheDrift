import { MOODS, MOOD_ORDER, INSTRUMENTS, ENSEMBLES, ENSEMBLE_ORDER, BINAURAL, BIN_CARRIER } from './constants.js';
import { mulberry32, midiToFreq, clamp, noteName, hashMood } from './utils.js';
import { assignOrbits, orbitPosition } from './orbit.js';

/* The Drift — generative ambient engine
   Felt-piano synthesis + generated reverb + unequal-loop scheduler.
   ES module, converted from the original IIFE. The UI reads engine state
   each animation frame; the engine never touches the DOM. */

// ---- expert "Atelier" parsing -------------------------------------
// scale degrees encoded as "0.2.4.5.7.9.11" -> [0,2,4,5,7,9,11]
export function parseScaleNotes(str) {
  if (!str) return [];
  const out = [];
  for (const tok of String(str).split(".")) {
    const n = parseInt(tok, 10);
    if (!isNaN(n) && n >= 0 && n <= 11 && out.indexOf(n) < 0) out.push(n);
  }
  out.sort(function (a, b) { return a - b; });
  return out;
}
// the scale-tone pool for a given mood/key/mode/register: register sets the
// lowest octave, then a 3-octave pool of scale tones is built. Shared by the
// voice generator and the Atelier note picker so they can never disagree.
export function buildScalePool(p) {
  const mood = MOODS[p.mood] || MOODS.reflection;
  let root = mood.root, notes = mood.notes;
  if (p.mood === "custom") {
    root = (((Math.round(p.key || 0)) % 12) + 12) % 12;
    const cn = parseScaleNotes(p.scaleNotes);
    if (cn.length) notes = cn;
  }
  const base = Math.round(41 + p.register * 19); // F2(41)..C4(60)
  const pool = [];
  for (let oct = 0; oct < 3; oct++) {
    for (const d of notes) {
      const m = base + root + d + 12 * oct;
      if (m <= base + 30) pool.push(m);
    }
  }
  pool.sort(function (a, b) { return a - b; });
  return { base, pool };
}
// pick a scale tone from a pool by a 0..1 height (0 = lowest, 1 = highest).
// Used by the tap "play-along" feature so vertical position maps to pitch.
export function poolNote(pool, pitch01) {
  if (!pool || !pool.length) return null;
  const t = pitch01 < 0 ? 0 : pitch01 > 1 ? 1 : pitch01;
  return pool[Math.round(t * (pool.length - 1))];
}
// voice specs "inst:note:len:lock" joined by "," -> [{inst,note,len,lock}]
// inst "*" = random from ensemble; note/len "_" = generative (roam)
export function parseVoices(str) {
  if (!str) return [];
  const specs = [];
  for (const part of String(str).split(",")) {
    if (!part) continue;
    const f = part.split(":");
    const inst = f[0] && f[0] !== "*" ? f[0] : null;
    const note = f[1] && f[1] !== "_" ? parseInt(f[1], 10) : null;
    const len = f[2] && f[2] !== "_" ? parseFloat(f[2]) : null;
    const lock = f[3] === "1";
    specs.push({
      inst: inst,
      note: note != null && !isNaN(note) ? note : null,
      len: len != null && !isNaN(len) ? len : null,
      lock: lock,
    });
  }
  return specs;
}

// ---- engine --------------------------------------------------------
function AmbientEngine() {
  this.ctx = null;
  this.playing = false;
  this.voices = [];
  this._scope = null;       // lazy analyser taps for the Atelier scopes
  this.userVolume = 0.85;   // 0..1 master listening level
  this.spatial = false;     // 3D HRTF placement matching the orrery (headphones)
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
    sidechain: 0,   // struck strikes duck the drones + ambience 0..1 (0 = off)
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

  // generative sidechain: sustained (drone) voices route through padOut, a duck
  // gain that struck strikes dip so the pads breathe around the bells. It feeds
  // the current field's fieldOut so scene crossfades still fade the pads.
  this.padOut = ctx.createGain();
  this.padOut.gain.value = 1;
  this.padOut.connect(this.fieldOut);

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
  // textureDuck sits after the ambience level so the sidechain can dip the bed
  // without fighting the Ambience mixer fader.
  this.textureDuck = ctx.createGain();
  this.textureDuck.gain.value = 1;
  this.textureBus.connect(this.textureDuck);
  this.textureDuck.connect(this.warm);
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

// ---- brainwave beats: binaural / monaural / isochronic --------------
// binBus -> master is built once (dry, bypassing reverb & compression so the
// perceived beat stays clean) and stays put; the source nodes feeding it are
// (re)built per mode. Silent until a band is chosen AND playback is running.
//   binaural   — two sines hard-isolated L/R; the difference is heard as a beat
//                only on headphones.
//   monaural   — the two sines summed to mono; the physical amplitude beat is
//                audible on speakers too.
//   isochronic — a single carrier pulsed on/off at the beat rate (rounded so it
//                doesn't click); the strongest cortical onset, no headphones.
AmbientEngine.prototype._buildBinaural = function () {
  if (this.binBus) return;
  const ctx = this.ctx;
  this.binBus = ctx.createGain(); this.binBus.gain.value = 0.0001;
  this.binBus.connect(this.master);
  this._binBand = this.params.binaural || "off";
  this._beatmode = this._beatmode || "binaural";
  this._buildBeatNodes();
  this._applyBinaural();
};

// a rounded unipolar pulse: sine in [-1,1] -> 0 on the negative half, a smooth
// hump on the positive half. Click-free isochronic gating (~50% duty).
AmbientEngine.prototype._isoCurve = function () {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = x > 0 ? Math.pow(x, 1.5) : 0;
  }
  return c;
};

// build the oscillator graph for the current mode, feeding binBus
AmbientEngine.prototype._buildBeatNodes = function () {
  const ctx = this.ctx;
  this._beatNodes = [];
  const keep = (node) => { this._beatNodes.push(node); return node; };
  if (this._beatmode === "isochronic") {
    const carrier = keep(ctx.createOscillator()); carrier.type = "sine";
    const amp = keep(ctx.createGain()); amp.gain.value = 0;     // gated by the LFO
    const lfo = keep(ctx.createOscillator()); lfo.type = "sine";
    const shaper = keep(ctx.createWaveShaper()); shaper.curve = this._isoCurve();
    const depth = keep(ctx.createGain()); depth.gain.value = 0.5; // pulse peak
    carrier.connect(amp); amp.connect(this.binBus);
    lfo.connect(shaper); shaper.connect(depth); depth.connect(amp.gain);
    carrier.start(); lfo.start();
    this._iCarrier = carrier; this._iLfo = lfo;
  } else {
    // binaural + monaural share two carrier oscillators
    const oscL = keep(ctx.createOscillator()); oscL.type = "sine";
    const oscR = keep(ctx.createOscillator()); oscR.type = "sine";
    const gL = keep(ctx.createGain()); gL.gain.value = 0.5;
    const gR = keep(ctx.createGain()); gR.gain.value = 0.5;
    oscL.connect(gL); oscR.connect(gR);
    if (this._beatmode === "monaural") {
      gL.connect(this.binBus); gR.connect(this.binBus); // summed to mono
    } else {
      const merger = keep(ctx.createChannelMerger(2));
      gL.connect(merger, 0, 0); gR.connect(merger, 0, 1); // hard L/R
      merger.connect(this.binBus);
    }
    oscL.start(); oscR.start();
    this.binL = oscL; this.binR = oscR;
  }
};

AmbientEngine.prototype._teardownBeatNodes = function () {
  if (!this._beatNodes) return;
  for (const node of this._beatNodes) {
    try { if (node.stop) node.stop(); } catch (e) {}
    try { node.disconnect(); } catch (e) {}
  }
  this._beatNodes = [];
  this.binL = this.binR = this._iCarrier = this._iLfo = null;
};

// set the active band's frequencies for the current mode and ramp the level —
// audible only while a band is on and playback is running
AmbientEngine.prototype._applyBinaural = function () {
  if (!this.ctx || !this.binBus) return;
  const band = this._binBand || "off";
  const beat = BINAURAL[band] || 0;
  const t = this.ctx.currentTime;
  if (this._beatmode === "isochronic") {
    if (this._iCarrier) this._iCarrier.frequency.setTargetAtTime(BIN_CARRIER, t, 0.06);
    if (this._iLfo) this._iLfo.frequency.setTargetAtTime(Math.max(0.0001, beat), t, 0.06);
  } else {
    if (this.binL) this.binL.frequency.setTargetAtTime(BIN_CARRIER - beat / 2, t, 0.06);
    if (this.binR) this.binR.frequency.setTargetAtTime(BIN_CARRIER + beat / 2, t, 0.06);
  }
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

// switch beat delivery mode (binaural/monaural/isochronic) — rebuild the source
// graph, leaving binBus -> master and the active band/level intact.
AmbientEngine.prototype.setBeatMode = function (mode) {
  if (mode !== "binaural" && mode !== "monaural" && mode !== "isochronic") mode = "binaural";
  if (mode === this._beatmode) return;
  this._beatmode = mode;
  if (this.ctx && this.binBus) {
    this._teardownBeatNodes();
    this._buildBeatNodes();
    this._applyBinaural();
  }
};

// ---- resonance breathing: an audible breath guide -------------------
// a soft band of "air" that swells in on the inhale and ebbs on the exhale, so
// the whole field breathes with the pacer. Key-agnostic (filtered noise, not a
// pitched tone) so it never clashes with the music. Built lazily on first use;
// the per-frame phase 0..1 comes from the animation loop via setBreathPhase.
AmbientEngine.prototype._buildBreath = function () {
  if (this.breathBus || !this.ctx) return;
  const ctx = this.ctx;
  this.breathBus = ctx.createGain(); this.breathBus.gain.value = 0.0001;
  this.breathBus.connect(this.master);
  const src = this._pinkSource();
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.6; // breath-like band
  src.connect(bp); bp.connect(this.breathBus);
  src.start();
  this._breathSrc = src;
};

// enable/disable the audible breath. Silences cleanly when turned off.
AmbientEngine.prototype.setBreathActive = function (on) {
  this._breathActive = !!on;
  if (!this.ctx) return;
  if (on) this._buildBreath();
  if (this.breathBus && !on) {
    this.breathBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
  }
};

// per-frame breath swell, ease in 0..1 (0 = empty/exhaled, 1 = full/inhaled).
// Cheap enough to call every animation frame.
AmbientEngine.prototype.setBreathPhase = function (ease) {
  if (!this.ctx || !this._breathActive || !this.playing) return;
  if (!this.breathBus) this._buildBreath();   // pref may have been set before the ctx existed
  if (!this.breathBus) return;
  const e = clamp(ease, 0, 1);
  const peak = 0.05;  // soft; sits under the music
  this.breathBus.gain.setTargetAtTime(0.0004 + e * peak, this.ctx.currentTime, 0.05);
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

// Dedicated analyser taps for the Atelier scopes (spectrogram + stereo
// vectorscope). Built lazily on first use and cached — deliberately NOT in
// ensureContext, because that is reused for the offline WAV render and these
// taps must never exist there. Idempotent and null-safe. The taps are sinks
// off `this.fade`, so fade -> limiter -> destination is untouched.
// Returns { spec, left, right } or null when there is no live context yet.
AmbientEngine.prototype.getScopeAnalysers = function () {
  if (!this.ctx) return null;            // autoplay: no ctx until first play
  if (this._scope) return this._scope;   // idempotent
  const ctx = this.ctx;
  // crisp spectrogram analyser — bigger FFT + low smoothing, unlike the
  // mandala's heavily-smoothed `this.analyser`
  const spec = ctx.createAnalyser();
  spec.fftSize = 2048;
  spec.smoothingTimeConstant = 0.3;
  this.fade.connect(spec);
  // L/R time-domain analysers for the vectorscope, via a channel splitter
  const splitter = ctx.createChannelSplitter(2);
  const left = ctx.createAnalyser();
  const right = ctx.createAnalyser();
  left.fftSize = 1024; left.smoothingTimeConstant = 0;
  right.fftSize = 1024; right.smoothingTimeConstant = 0;
  this.fade.connect(splitter);
  splitter.connect(left, 0);
  splitter.connect(right, 1);
  // The spectrogram analyser works by tapping `fade` directly (already pulled
  // to destination). The splitter is a processing node, though, and only runs
  // if its branch reaches the destination — so terminate it at a muted sink,
  // else both analysers read silence (a dead centre dot). Gain 0 = inaudible.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  left.connect(sink);
  right.connect(sink);
  sink.connect(ctx.destination);
  this._scope = { spec, left, right, _splitter: splitter, _sink: sink };
  return this._scope;
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

  // expert "Atelier": custom key + scale override the mood's root/notes;
  // build the 3-octave scale-tone pool (and its low base) for this field
  const { base, pool } = buildScalePool(p);

  // length spread: tight -> all loops similar; wide -> very unequal
  const spread = p.drift;
  const minP = 9 - spread * 1.0;            // ~8..9s
  const maxP = 14 + spread * 34;            // ~14..48s
  // tempo scales every loop length (exponential; 0.5 = unchanged)
  const paceMult = Math.pow(2, (0.5 - p.tempo) * 2); // slow ~2x .. fast ~0.5x

  const now = this.ctx ? this.ctx.currentTime : 0;

  // build one voice. RNG is consumed in a fixed order regardless of whether a
  // field is hand-authored, so a custom spec only overrides the pinned fields
  // (note/inst/length) and editing one voice never reshuffles the others.
  const makeVoice = (i, spec) => {
    let midi = pool[Math.floor(rng() * pool.length)];
    let inst = instPool[Math.floor(rng() * instPool.length)];
    const rPeriod = rng();                 // base spread draw
    const rNudge = rng();                  // irrational nudge draw
    const phase = rng();                   // 0..1 initial offset
    const panBase = (rng() * 1.4 - 0.7) * (0.4 + 0.6 * spread);
    const panDepth = (0.16 + rng() * 0.4) * (0.45 + 0.55 * spread);
    const panRate = 0.012 + rng() * 0.032; // Hz (~30..80s sweep)
    const panPhase = rng() * Math.PI * 2;

    let notePinned = false, lenPinned = false, locked = false;
    if (spec) {
      if (spec.inst && INSTRUMENTS[spec.inst]) inst = spec.inst;
      if (spec.note != null) { midi = spec.note; notePinned = true; }
      locked = !!spec.lock;
    }

    const norm = clamp((midi - base) / 30, 0, 1); // 0 low .. 1 high
    const pscale = 1 + (1 - norm) * 0.45;         // lower notes loop slower
    let period = (minP + rPeriod * (maxP - minP)) * pscale * paceMult;
    period += (rNudge - 0.5) * 1.7 + (i % 2 === 0 ? 0.37 : -0.29);
    period = clamp(period, 3.5, 64);
    if (spec && spec.len != null) { period = clamp(spec.len, 3.5, 64); lenPinned = true; }

    const startTime = now - phase * period;
    return {
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
      notePinned: notePinned, lenPinned: lenPinned, locked: locked,
      viz: { prev: phase, strike: -999, fx: null, nextFx: null },
    };
  };

  // a hand-authored loom defines the field exactly; otherwise the seed rolls
  // `density` generative voices as before.
  const specs = parseVoices(p.voices);
  const voices = [];
  if (specs.length) {
    for (let i = 0; i < specs.length; i++) voices.push(makeVoice(i, specs[i]));
  } else {
    for (let i = 0; i < n; i++) voices.push(makeVoice(i, null));
  }
  voices.sort(function (a, b) { return a.period - b.period; });
  voices.forEach(function (v, idx) { v.row = idx; });
  // stable orbit geometry shared with the WebGL view + spatial audio
  assignOrbits(voices);

  // remember the scale pool so autonomous drift can re-voice notes later
  this._pool = pool;
  this._base = base;

  // route the new field and seed each voice's first autonomous mutation time
  const ev = this.params.evolve || 0;
  const out = crossfade ? this._newFieldOut() : this.fieldOut;
  const padOut = crossfade ? this._newPadOut(out) : this.padOut;
  for (const v of voices) {
    const inst = INSTRUMENTS[v.inst];
    // sustained drones duck (padOut); struck/glitch voices trigger the duck, so
    // they must bypass it (route straight to the field out).
    v._out = (inst && inst.sustained) ? padOut : out;
    v._mutateAt = now + (24 + rng() * 44) / (0.3 + ev);
    if (this.spatial && this.ctx) this._buildVoiceSpatial(v);
  }

  if (crossfade) { this._beginCrossfade(out); this.padOut = padOut; }
  this.voices = voices;
};

// per-voice spatial chain: strikes feed _spatialBus -> HRTF panner -> field.
// rolloffFactor 0 means distance never changes loudness — only direction.
AmbientEngine.prototype._buildVoiceSpatial = function (v) {
  const ctx = this.ctx;
  v._spatialBus = ctx.createGain();
  const pan = ctx.createPanner();
  pan.panningModel = "HRTF";
  pan.distanceModel = "inverse";
  pan.rolloffFactor = 0;
  v._panner = pan;
  v._spatialBus.connect(pan);
  pan.connect(v._out || this.fieldOut || this.bus);
  // seed its starting position
  orbitPosition(v.orbit, (v.viz.prev || 0) * Math.PI * 2, this._spTmp || (this._spTmp = [0, 0, 0]));
  this._setPannerPos(pan, this._spTmp[0], this._spTmp[1], this._spTmp[2] - 5.6, 0);
};

// set a panner position (AudioParam path with a setPosition fallback)
AmbientEngine.prototype._setPannerPos = function (pan, x, y, z, tc) {
  if (pan.positionX) {
    const t = this.ctx.currentTime;
    if (tc > 0) {
      pan.positionX.setTargetAtTime(x, t, tc);
      pan.positionY.setTargetAtTime(y, t, tc);
      pan.positionZ.setTargetAtTime(z, t, tc);
    } else {
      pan.positionX.setValueAtTime(x, t);
      pan.positionY.setValueAtTime(y, t);
      pan.positionZ.setValueAtTime(z, t);
    }
  } else if (pan.setPosition) {
    pan.setPosition(x, y, z);
  }
};

// toggle 3D spatial placement; rebuild routing so it takes effect cleanly
AmbientEngine.prototype.setSpatial = function (on) {
  on = !!on;
  if (this.spatial === on) return;
  this.spatial = on;
  if (this.ctx) this.regenerate({ crossfade: !!this.playing });
};

// called once per animation frame by the UI: place every voice's sound where
// its orb appears, rotated into the live camera's view so the soundstage turns
// with the orrery. cam = { yaw, pitch, dist }.
AmbientEngine.prototype.updateSpatial = function (cam) {
  if (!this.spatial || !this.ctx || !this.voices) return;
  const yaw = cam ? cam.yaw : 0, pitch = cam ? cam.pitch : 0, dist = cam ? cam.dist : 5.6;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const tmp = this._spTmp || (this._spTmp = [0, 0, 0]);
  for (const v of this.voices) {
    if (!v._panner || !v.orbit) continue;
    orbitPosition(v.orbit, (v.viz.prog || 0) * Math.PI * 2, tmp);
    const x = tmp[0], y = tmp[1], z = tmp[2];
    // rotate world -> view with the same R as the WebGL camera (Rx(pitch)·Ry(yaw))
    const vx = cy * x - sy * z;
    const vy = sx * sy * x + cx * y + sx * cy * z;
    const vz = cx * sy * x - sx * y + cx * cy * z;
    this._setPannerPos(v._panner, vx, vy, vz - dist, 0.05);
  }
};

// a fresh field gain, starting silent, ready to fade up into the bus
AmbientEngine.prototype._newFieldOut = function () {
  const g = this.ctx.createGain();
  g.gain.value = 0.0001;
  g.connect(this.bus);
  return g;
};

// point each current voice at the right field output: drones through the
// duckable padOut, everything else straight to fieldOut. Used when the initial
// field (built before the AudioContext existed) first starts playing.
AmbientEngine.prototype._rerouteVoices = function () {
  if (!this.voices) return;
  for (const v of this.voices) {
    const inst = INSTRUMENTS[v.inst];
    v._out = (inst && inst.sustained) ? this.padOut : this.fieldOut;
  }
};

// a fresh pad-duck gain for a new field, feeding that field's out so its drones
// fade with the crossfade while still being duckable by strikes.
AmbientEngine.prototype._newPadOut = function (fieldGain) {
  const g = this.ctx.createGain();
  g.gain.value = 1;
  g.connect(fieldGain);
  return g;
};

// generative sidechain: dip the drone pads + ambience on a struck strike, then
// swell back. Feed-forward (scheduled at the strike), so it is deterministic and
// survives the offline WAV export. Heavier (louder, lower) strikes duck deeper.
AmbientEngine.prototype._duck = function (time, vel, midi) {
  const amt = clamp(this.params.sidechain || 0, 0, 1);
  if (amt <= 0.001) return;
  const pitchW = clamp(1 - (midi - 40) / 40, 0.3, 1);   // low/heavy -> ~1, high -> ~0.3
  const depth = amt * (vel == null ? 1 : vel) * pitchW; // 0..~1
  const tgtTex = Math.max(0.1, 1 - depth * 0.85);       // ambience can duck deep
  const tgtPad = Math.max(0.3, 1 - depth * 0.55);       // drones duck gentler
  const atkTC = 0.012, relTC = 0.18, hold = 0.04;       // fast dip, ~0.5s swell back
  if (this.textureDuck) {
    this.textureDuck.gain.setTargetAtTime(tgtTex, time, atkTC);
    this.textureDuck.gain.setTargetAtTime(1, time + hold, relTC);
  }
  if (this.padOut) {
    this.padOut.gain.setTargetAtTime(tgtPad, time, atkTC);
    this.padOut.gain.setTargetAtTime(1, time + hold, relTC);
  }
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
  opts = opts || {};
  if (inst.kind === "arp") this._synthArp(v, time, opts, inst);
  else if (inst.kind === "chirp") this._synthChirp(v, time, opts, inst);
  else if (inst.kind === "trill") this._synthTrill(v, time, opts, inst);
  else if (inst.sustained) this._synthSustained(v, time, opts, inst);
  else this._synthStruck(v, time, opts, inst);
};

// ---- Glitch family: short multi-note gestures -----------------------
// nearest index of a midi note within the current scale pool
AmbientEngine.prototype._poolIndex = function (midi) {
  const pool = this._pool || [];
  let idx = pool.indexOf(midi);
  if (idx >= 0) return idx;
  let best = 1e9;
  for (let i = 0; i < pool.length; i++) {
    const d = Math.abs(pool[i] - midi);
    if (d < best) { best = d; idx = i; }
  }
  return Math.max(0, idx);
};

// one short plucked tone routed through a shared gesture bus
AmbientEngine.prototype._synthBlip = function (bus, freq, time, dur, vel, color, wave, glideTo) {
  const ctx = this.ctx;
  const g = ctx.createGain();
  const peak = 0.12 * vel;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = clamp(1400 + color * 5200, 500, 9500);
  lp.Q.value = 0.4;
  const o = ctx.createOscillator();
  o.type = wave || "triangle";
  o.frequency.setValueAtTime(Math.max(20, freq), time);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(clamp(glideTo, 20, 9000), time + dur * 0.85);
  o.connect(lp); lp.connect(g); g.connect(bus);
  o.start(time); o.stop(time + dur + 0.05);
};

// arpeggio: a rapid broken chord that walks up or down the scale in thirds
AmbientEngine.prototype._synthArp = function (v, time, opts, inst) {
  const ctx = this.ctx;
  const color = this._effColor();
  const vel = (opts.vel == null ? 1 : opts.vel) * inst.gain;
  const pool = this._pool || [];
  if (!pool.length) return;
  const idx = this._poolIndex(v.midi);
  const up = Math.random() < 0.62;
  const steps = 4 + Math.floor(Math.random() * 4);   // 4..7 notes
  const gap0 = 0.06 + Math.random() * 0.04;
  const onset = time + (Math.random() - 0.5) * 0.01;
  const span = steps * gap0 + 0.6;
  const bus = ctx.createGain();
  this._panOut(v, bus, onset, span);
  let t = onset;
  for (let k = 0; k < steps; k++) {
    const pIdx = clamp(idx + (up ? 1 : -1) * k * 2, 0, pool.length - 1); // thirds
    const f = midiToFreq(pool[pIdx], this.params.tuning);
    const last = k === steps - 1;
    this._synthBlip(bus, f, t, last ? 0.6 : 0.34, vel * Math.pow(0.94, k), color, inst.wave);
    t += gap0;
  }
};

// chirp: a soft, high birdsong burst — a few quick up-glides
AmbientEngine.prototype._synthChirp = function (v, time, opts, inst) {
  const ctx = this.ctx;
  const color = this._effColor();
  const vel = (opts.vel == null ? 1 : opts.vel) * inst.gain;
  const burst = 2 + Math.floor(Math.random() * 4);   // 2..5 chirps
  const onset = time + (Math.random() - 0.5) * 0.01;
  const bus = ctx.createGain();
  this._panOut(v, bus, onset, 0.9);
  let t = onset;
  for (let b = 0; b < burst; b++) {
    const top = clamp(v.freq * (2 + Math.floor(Math.random() * 2)) * (0.9 + Math.random() * 0.3), 700, 5200);
    const dur = 0.04 + Math.random() * 0.05;
    // start a touch below and glide up — the soft "shrill"
    this._synthBlip(bus, top * 0.62, t, dur, vel * 0.5, color, inst.wave, top * (1.05 + Math.random() * 0.25));
    t += dur + 0.03 + Math.random() * 0.09;
  }
};

// trill: rapid soft alternation between a note and an upper neighbour
AmbientEngine.prototype._synthTrill = function (v, time, opts, inst) {
  const ctx = this.ctx;
  const color = this._effColor();
  const vel = (opts.vel == null ? 1 : opts.vel) * inst.gain;
  const pool = this._pool || [];
  if (!pool.length) return;
  const idx = this._poolIndex(v.midi);
  const hi = clamp(idx + 1 + Math.floor(Math.random() * 2), 0, pool.length - 1);
  const f0 = v.freq, f1 = midiToFreq(pool[hi], this.params.tuning);
  const n = 6 + Math.floor(Math.random() * 7);       // 6..12 notes
  const gap = 0.05 + Math.random() * 0.02;
  const onset = time + (Math.random() - 0.5) * 0.01;
  const bus = ctx.createGain();
  this._panOut(v, bus, onset, n * gap + 0.3);
  let t = onset;
  for (let k = 0; k < n; k++) {
    const last = k === n - 1;
    this._synthBlip(bus, k % 2 ? f1 : f0, t, last ? 0.4 : 0.15, vel * 0.62 * Math.pow(0.97, k), color, inst.wave);
    t += gap;
  }
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
  this._duck(onset, opts.vel == null ? 1 : opts.vel, v.midi);

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

// stereo placement that drifts slowly and travels across the note's life.
// in spatial mode the note feeds the voice's persistent HRTF panner instead,
// which is positioned each frame to match the orb in the 3D view.
AmbientEngine.prototype._panOut = function (v, node, onset, span) {
  if (this.spatial && v._spatialBus) {
    node.connect(v._spatialBus);
    return;
  }
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
    // occasionally leap further for a fresh colour. A locked + pinned note
    // holds (the Atelier "spirit" rule); everything else still drifts.
    if (pool && pool.length && !(v.locked && v.notePinned)) {
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

    // nudge the loop length, rebased so the playhead phase stays continuous.
    // a locked + pinned length holds.
    if (!(v.locked && v.lenPinned) && Math.random() < 0.55) {
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
  if (this.ctx.state === "suspended") { const r = this.ctx.resume(); if (r && r.catch) r.catch(function (e) { console.warn("AudioContext resume failed (play):", e); }); }
  if (!this.voices.length) this.regenerate();
  else { this._rebase(); this._rerouteVoices(); }
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
  r.spatial = false;                    // print the stereo mix (no per-frame loop offline)
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
  // release the sidechain so the pads/ambience don't resume stuck mid-duck
  if (this.ctx) {
    const t = this.ctx.currentTime;
    if (this.textureDuck) { this.textureDuck.gain.cancelScheduledValues(t); this.textureDuck.gain.setValueAtTime(1, t); }
    if (this.padOut) { this.padOut.gain.cancelScheduledValues(t); this.padOut.gain.setValueAtTime(1, t); }
    if (this.breathBus) { this.breathBus.gain.cancelScheduledValues(t); this.breathBus.gain.setTargetAtTime(0.0001, t, 0.1); }
  }
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
  if (this.ctx.state === "suspended") { const r = this.ctx.resume(); if (r && r.catch) r.catch(function (e) { console.warn("AudioContext resume failed (strikeBell):", e); }); }
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
  this._duck(now, vel, midi);   // a heavy bell breathes the pads + ambience aside

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

// ---- tap "play-along" ----------------------------------------------
// a user-dropped transient that joins the field without touching the
// scheduler. Routes through fieldOut so it shares the field's reverb/glue.
// An instrument is borrowed from the nearest-pitched playing voice so the
// drop blends; glitch drops use a short arp/chirp/trill gesture instead.
AmbientEngine.prototype._nearestStruckInst = function (midi) {
  let best = null, bestD = 1e9;
  for (const v of this.voices) {
    const inst = INSTRUMENTS[v.inst];
    if (!inst || inst.sustained || inst.kind) continue;   // struck only
    const d = Math.abs(v.midi - midi);
    if (d < bestD) { bestD = d; best = v.inst; }
  }
  return best || "harp";
};
AmbientEngine.prototype._glitchInst = function () {
  const g = ["arp", "chirp", "trill"];
  return g[Math.floor(Math.random() * g.length)];
};
// opts: { pitch01 (0..1 height), pan (-1..1), vel, glitch }
AmbientEngine.prototype.dropNote = function (opts) {
  this.ensureContext();
  if (this.ctx.state === "suspended") { const r = this.ctx.resume(); if (r && r.catch) r.catch(function (e) { console.warn("AudioContext resume failed (dropNote):", e); }); }
  opts = opts || {};
  const pool = (buildScalePool(this.params) || {}).pool;
  const midi = poolNote(pool, opts.pitch01 == null ? 0.5 : opts.pitch01);
  if (midi == null) return null;
  const glitch = !!opts.glitch;
  const inst = glitch ? this._glitchInst() : this._nearestStruckInst(midi);
  const pan = clamp(opts.pan == null ? 0 : opts.pan, -1, 1);
  const v = {
    midi: midi, freq: midiToFreq(midi, this.params.tuning), inst: inst,
    family: (INSTRUMENTS[inst] && INSTRUMENTS[inst].family) || "piano",
    period: 4, panBase: pan, panDepth: 0, panRate: 0, panPhase: 0,
    _out: this.fieldOut, viz: {},
  };
  this.playVoice(v, this.ctx.currentTime, { vel: opts.vel == null ? 0.9 : opts.vel });
  return { midi: midi, family: v.family, glitch: glitch };
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
  if (key === "color" || key === "stutter" || key === "bloom" || key === "evolve" || key === "sidechain") return; // read live
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
  // mood / ensemble / custom-scale swap the palette -> dissolve across a
  // crossfade; density/tempo/drift/register/seed and per-voice loom edits
  // stay instant so the controls feel responsive
  const cross = (key === "mood" || key === "ensemble" || key === "key" || key === "scaleNotes");
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

export default AmbientEngine;

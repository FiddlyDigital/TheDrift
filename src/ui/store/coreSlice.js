import { ENGINE } from '../../engine/index.js';
import {
  SCENES, SCENE_BY_NAME, KEYS,
  JOURNEY_STEP_KEYS, JOURNEY_CONT_KEYS,
  DRIFT_POOL, SLEEP_FADE, WAKE_RISE, SESSION_DUCK,
  GANZFELD_PROGRAM, ganzfeldPhaseAt,
} from '../constants.js';
import { easeInOut, lerp, driftSegMs, driftPick } from './util.js';

const num = (k, d) => { try { const v = localStorage.getItem(k); return v != null ? +v : d; } catch (e) { return d; } };

// The cohesive "core": parameters, transport, the five timer systems, guided
// journeys and endless drift. These concerns share the engine, the play clock
// and each other (e.g. editing a param cancels a journey), so they live in one
// slice and cross-call through get().
export function createCoreSlice(set, get, init) {
  const { saved, WELCOME } = init;
  const initParams = (() => {
    const base = Object.assign({}, ENGINE.params, saved || {});
    if (!saved) Object.assign(base, WELCOME.p);
    return base;
  })();

  // start the engine and anchor the play clock to the current audio time
  const startEngine = () => {
    ENGINE.play();
    set({ startedAt: (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - get().elapsed, playing: true });
  };

  return {
    WELCOME,
    params: initParams,
    playing: false,
    elapsed: 0,
    startedAt: 0,
    volume: num('loops.volume', 0.85),
    activeScene: saved ? null : WELCOME.name,
    activeSaved: null,
    families: [],
    journeyPulse: null,           // {t0} marker the renderer reads for a pulse

    // sleep timer
    sleepDur: 0, sleepEnd: 0, sleepRemain: 0, _sleepFading: false,
    // wake timer
    wakeIn: 0, wakeAt: 0, wakeRising: false, _waking: false,
    // session timer
    sessionPick: num('loops.session.dur', 10),
    sessionInterval: num('loops.session.interval', 0),
    sessionEnd: 0, sessionRemain: 0,
    _nextBell: 0, _sessionEnding: false, _sessionTotal: 0,
    // guided journey
    journey: null, journeyRemain: 0, journeyStop: 0,
    _journeyEnd: 0, _journeyStep: -1, _journeyFading: false,
    // endless drift
    driftOn: false, driftNow: "", driftNext: "", driftProgress: 0,
    _driftActive: false, _driftFrom: null, _driftTo: null, _driftSegStart: 0, _driftSegDur: 0,
    // ganzfeld mode (a featureless, phased field with an audio takeover)
    ganzfeld: null, ganzfeldPhase: -1, ganzfeldElapsed: 0,
    _ganzfeldStartMs: 0, _ganzfeldStartAudio: 0, _ganzfeldStrobe: false, _prevVizMode: "mandala",

    _play: startEngine,
    setElapsed: (v) => set({ elapsed: v }),

    setVolume: (v) => {
      set({ volume: v });
      ENGINE.setVolume(v);
      try { localStorage.setItem("loops.volume", String(v)); } catch (e) {}
    },

    refreshFamilies: () => {
      const seen = [];
      for (const v of ENGINE.voices) if (seen.indexOf(v.family) < 0) seen.push(v.family);
      set({ families: seen });
    },

    update: (key, value) => {
      set({ params: Object.assign({}, get().params, { [key]: value }) });
      ENGINE.set(key, value);
      set({ activeScene: null, activeSaved: null });
      get().cancelJourney();
      get().cancelDrift();
      get().cancelGanzfeld();
    },

    applyScene: (sc) => {
      get().cancelJourney();
      get().cancelDrift();
      get().cancelGanzfeld();
      set({ params: Object.assign({}, get().params, sc.p) });
      ENGINE.setParams(Object.assign({}, ENGINE.params, sc.p));
      set({ activeScene: sc.name, activeSaved: null });
    },

    cycleScene: (dir) => {
      get().cancelJourney();
      get().cancelDrift();
      get().cancelGanzfeld();
      let idx = SCENES.findIndex((s) => s.name === get().activeScene);
      idx = idx < 0 ? (dir > 0 ? 0 : SCENES.length - 1)
                    : (idx + dir + SCENES.length) % SCENES.length;
      const sc = SCENES[idx];
      set({ params: Object.assign({}, get().params, sc.p), activeScene: sc.name, activeSaved: null });
      ENGINE.setParams(Object.assign({}, ENGINE.params, sc.p));
    },

    toggleTexture: (id) => {
      const cur = (get().params.texture || "").split(".").filter(Boolean);
      const i = cur.indexOf(id);
      if (i < 0) cur.push(id); else cur.splice(i, 1);
      const str = cur.join(".");
      ENGINE.set("texture", str);
      set({ params: Object.assign({}, get().params, { texture: str }) });
    },

    reshuffle: () => { get().update("seed", Math.floor(Math.random() * 99999) + 1); },

    toggle: () => {
      if (ENGINE.playing) {
        ENGINE.pause(); set({ playing: false });
        ENGINE.cancelFade(); set({ sleepDur: 0, sleepEnd: 0 });
      } else {
        startEngine();
      }
    },

    setSleep: (min) => {
      if (!min) { ENGINE.cancelFade(); set({ sleepDur: 0, sleepEnd: 0, sleepRemain: 0, _sleepFading: false }); return; }
      get().cancelGanzfeld();
      if (!ENGINE.playing) startEngine();
      ENGINE.cancelFade();
      set({ sleepDur: min, sleepEnd: Date.now() + min * 60000, _sleepFading: false });
    },

    setWake: (min) => {
      if (!min) {
        set({ wakeIn: 0, wakeAt: 0, wakeRising: false, _waking: false });
        ENGINE.cancelFade();
        return;
      }
      set({ sleepDur: 0, sleepEnd: 0, sessionEnd: 0, sessionRemain: 0, _sessionEnding: false });
      if (get()._journeyEnd) {
        set({ _journeyEnd: 0, _journeyStep: -1, _journeyFading: false, journey: null, journeyRemain: 0, journeyStop: 0 });
      }
      set({ _driftActive: false, driftOn: false });
      get().cancelGanzfeld();
      if (!ENGINE.playing) startEngine();
      ENGINE.silenceFade();
      set({ wakeIn: min, wakeAt: Date.now() + min * 60000, wakeRising: false, _waking: false });
    },

    setSessionPick: (v) => {
      set({ sessionPick: v });
      try { localStorage.setItem("loops.session.dur", String(v)); } catch (e) {}
    },

    setSessionInterval: (v) => {
      try { localStorage.setItem("loops.session.interval", String(v)); } catch (e) {}
      const { sessionEnd } = get();
      let nb = get()._nextBell;
      if (sessionEnd && v > 0) nb = Date.now() + v * 60000;
      else if (!v) nb = 0;
      set({ sessionInterval: v, _nextBell: nb });
    },

    beginSession: (min) => {
      if (!min) return;
      get().cancelGanzfeld();
      ENGINE.cancelFade(); set({ sleepDur: 0, sleepEnd: 0 });
      if (!ENGINE.playing) startEngine();
      else { ENGINE.setLoopLevel(ENGINE.params.looplevel); ENGINE.setTextureLevel(ENGINE.params.texlevel); }
      const now = Date.now();
      const itv = get().sessionInterval;
      ENGINE.strikeBell({ vel: 1, decay: 11 });
      set({
        _sessionEnding: false,
        _nextBell: itv > 0 ? now + itv * 60000 : 0,
        _sessionTotal: min * 60,
        sessionRemain: min * 60,
        sessionEnd: now + min * 60000,
      });
    },

    endSession: () => { set({ _sessionEnding: false, _nextBell: 0, sessionEnd: 0, sessionRemain: 0 }); },

    beginJourney: (j) => {
      if (!j) return;
      get().cancelDrift();
      get().cancelGanzfeld();
      const stops = j.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
      if (stops.length < 2) return;
      ENGINE.cancelFade();
      set({ sleepDur: 0, sleepEnd: 0, sessionEnd: 0, sessionRemain: 0, _sessionEnding: false });
      const first = Object.assign({}, stops[0].p, { journey: 0 });
      set({ params: Object.assign({}, get().params, first) });
      if (!ENGINE.playing) {
        ENGINE.setParams(Object.assign({}, ENGINE.params, first));
        startEngine();
      } else {
        ENGINE.setParams(Object.assign({}, ENGINE.params, first));
      }
      set({
        activeScene: null, activeSaved: null,
        _journeyStep: 0, _journeyFading: false,
        _journeyEnd: Date.now() + j.total * 60000,
        journey: j, journeyStop: 0, journeyRemain: j.total * 60,
      });
    },

    cancelJourney: (opts) => {
      opts = opts || {};
      if (!get()._journeyEnd) return;
      if (opts.silent !== true) ENGINE.cancelFade();
      set({
        _journeyEnd: 0, _journeyStep: -1, _journeyFading: false,
        journey: null, journeyRemain: 0, journeyStop: 0,
      });
    },

    beginDrift: () => {
      get().cancelGanzfeld();
      ENGINE.cancelFade();
      set({ sleepDur: 0, sleepEnd: 0, sessionEnd: 0, sessionRemain: 0, _sessionEnding: false });
      if (get()._journeyEnd) {
        set({ _journeyEnd: 0, _journeyStep: -1, _journeyFading: false, journey: null, journeyRemain: 0, journeyStop: 0 });
      }
      let idx = DRIFT_POOL.indexOf(get().activeScene);
      if (idx < 0) idx = Math.floor(Math.random() * DRIFT_POOL.length);
      const fromName = DRIFT_POOL[idx];
      const first = Object.assign({}, SCENE_BY_NAME[fromName].p, { journey: 0 });
      set({ params: Object.assign({}, get().params, first) });
      if (!ENGINE.playing) {
        ENGINE.setParams(Object.assign({}, ENGINE.params, first));
        startEngine();
      } else {
        ENGINE.setParams(Object.assign({}, ENGINE.params, first));
      }
      const toIdx = driftPick(idx);
      set({
        activeScene: null, activeSaved: null,
        _driftFrom: fromName, _driftTo: DRIFT_POOL[toIdx],
        _driftSegStart: Date.now(), _driftSegDur: driftSegMs(), _driftActive: true,
        driftNow: fromName, driftNext: DRIFT_POOL[toIdx], driftProgress: 0, driftOn: true,
      });
    },

    cancelDrift: () => {
      if (!get()._driftActive) return;
      set({ _driftActive: false, driftOn: false, driftNow: "", driftNext: "", driftProgress: 0 });
    },

    // ---- ganzfeld: a featureless, phased field with an audio takeover --------
    // All audio changes are engine-level only (the store params and share URL
    // are left untouched), so exiting restores the listener's exact prior sound.
    beginGanzfeld: (opts) => {
      opts = opts || {};
      // mutual exclusion: stop every other autonomous system first
      get().cancelJourney({ silent: true });
      get().cancelDrift();
      ENGINE.cancelFade();
      set({
        sleepDur: 0, sleepEnd: 0, sleepRemain: 0, _sleepFading: false,
        wakeIn: 0, wakeAt: 0, wakeRising: false, _waking: false,
        sessionEnd: 0, sessionRemain: 0, _sessionEnding: false, _nextBell: 0,
      });
      if (!ENGINE.playing) startEngine();
      set({
        ganzfeld: GANZFELD_PROGRAM, ganzfeldPhase: -1, ganzfeldElapsed: 0,
        _ganzfeldStartMs: Date.now(),
        _ganzfeldStartAudio: ENGINE.ctx ? ENGINE.ctx.currentTime : 0,
        _ganzfeldStrobe: !!opts.strobe,
        _prevVizMode: get().vizMode === "ganzfeld" ? "mandala" : get().vizMode,
        vizMode: "ganzfeld", immersive: true,
      });
      get().ganzfeldTick();   // apply the opening phase immediately
    },

    ganzfeldTick: () => {
      const prog = get().ganzfeld;
      if (!prog) return;
      const elapsed = (Date.now() - get()._ganzfeldStartMs) / 1000;
      set({ ganzfeldElapsed: elapsed });
      const idx = ganzfeldPhaseAt(elapsed);
      if (idx === get().ganzfeldPhase) return;
      const a = prog.phases[idx].audio;
      ENGINE.setLoopLevel(a.loop);
      ENGINE.setBinaural(a.binaural);
      ENGINE.setBinLevel(a.binlevel);
      ENGINE.setTextures(a.texture);
      ENGINE.setTextureLevel(a.texlevel);
      set({ ganzfeldPhase: idx });
    },

    cancelGanzfeld: () => {
      if (!get().ganzfeld) return;
      // restore the audio to the listener's live settings (engine-level only)
      const p = get().params;
      ENGINE.setLoopLevel(p.looplevel == null ? 1 : p.looplevel);
      ENGINE.setBinaural(p.binaural || "off");
      ENGINE.setBinLevel(p.binlevel == null ? 0.4 : p.binlevel);
      ENGINE.setTextures(p.texture ? p.texture.split(".").filter(Boolean) : []);
      ENGINE.setTextureLevel(p.texlevel == null ? 0.36 : p.texlevel);
      set({
        ganzfeld: null, ganzfeldPhase: -1, ganzfeldElapsed: 0,
        _ganzfeldStartMs: 0, _ganzfeldStartAudio: 0,
        vizMode: get()._prevVizMode || "mandala",
      });
    },

    onJourneyInfo: (info) => {
      set({
        params: Object.assign({}, get().params, { mood: info.mood, color: info.color, register: info.register }),
        activeScene: null, activeSaved: null,
      });
    },

    // ---- per-interval ticks (driven by useTimers) ----
    sleepTick: () => {
      const { sleepEnd } = get();
      if (!sleepEnd) { set({ sleepRemain: 0 }); return; }
      const rem = Math.max(0, (sleepEnd - Date.now()) / 1000);
      set({ sleepRemain: rem });
      if (rem <= SLEEP_FADE && !get()._sleepFading) { set({ _sleepFading: true }); ENGINE.sleepFade(rem); }
      if (rem <= 0) {
        ENGINE.pause(); set({ playing: false }); ENGINE.cancelFade();
        set({ sleepDur: 0, sleepEnd: 0, sleepRemain: 0, _sleepFading: false });
      }
    },

    wakeTick: () => {
      const { wakeAt } = get();
      if (!wakeAt) return;
      const remToRise = (wakeAt - Date.now()) / 1000;
      if (!get()._waking && remToRise <= 0) {
        set({ _waking: true, wakeRising: true });
        if (!ENGINE.playing) startEngine();
        ENGINE.wakeFade(WAKE_RISE);
      }
      if (get()._waking && remToRise <= -WAKE_RISE) {
        set({ wakeIn: 0, wakeAt: 0, wakeRising: false, _waking: false });
      }
    },

    sessionTick: () => {
      const { sessionEnd } = get();
      if (!sessionEnd) { set({ sessionRemain: 0 }); return; }
      const now = Date.now();
      const rem = Math.max(0, (sessionEnd - now) / 1000);
      set({ sessionRemain: rem });
      if (get()._nextBell && get().sessionInterval > 0 && now >= get()._nextBell && rem > 15) {
        ENGINE.strikeBell({ octave: 1, vel: 0.78, decay: 7 });
        set({ _nextBell: now + get().sessionInterval * 60000 });
      }
      if (rem <= 0 && !get()._sessionEnding) {
        set({ _sessionEnding: true });
        ENGINE.strikeBell({ vel: 1, decay: 12, delay: 0 });
        ENGINE.strikeBell({ vel: 0.92, decay: 12, delay: 3.4 });
        ENGINE.strikeBell({ vel: 0.86, decay: 13, delay: 6.8 });
        ENGINE.duckField(SESSION_DUCK);
        setTimeout(() => { ENGINE.pause(); set({ playing: false }); }, (SESSION_DUCK + 2.5) * 1000);
        set({ sessionEnd: 0, sessionRemain: 0, _nextBell: 0 });
      }
    },

    journeyTick: () => {
      const j = get().journey;
      if (!j) return;
      const stops = j.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
      const N = stops.length;
      const totalSec = j.total * 60;
      const segDur = totalSec / (N - 1);
      const FADE = 60;
      const now = Date.now();
      const jEnd = get()._journeyEnd;
      const elapsedSec = totalSec - Math.max(0, (jEnd - now) / 1000);
      const rem = Math.max(0, (jEnd - now) / 1000);
      set({ journeyRemain: rem });

      const rawSeg = Math.min(N - 1, Math.floor(elapsedSec / segDur + 1e-6));
      let step = get()._journeyStep;
      while (step < rawSeg) {
        step += 1;
        const stop = stops[step];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        set({
          params: Object.assign({}, get().params, stepObj),
          _journeyStep: step, journeyStop: step,
          journeyPulse: { t0: ENGINE.ctx ? ENGINE.ctx.currentTime : 0 },
        });
      }

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
      set({ params: Object.assign({}, get().params, contObj) });

      if (j.fadeOut) {
        if (rem <= FADE && !get()._journeyFading) { set({ _journeyFading: true }); ENGINE.sleepFade(rem); }
        if (rem <= 0) {
          ENGINE.pause(); set({ playing: false }); ENGINE.cancelFade();
          get().cancelJourney({ silent: true });
        }
      } else if (rem <= 0) {
        set({ activeScene: j.stops[N - 1] });
        get().cancelJourney({ silent: true });
      }
    },

    driftTick: () => {
      const now = Date.now();
      let f = (now - get()._driftSegStart) / get()._driftSegDur;
      if (f >= 1) {
        const toName = get()._driftTo;
        const toIdx = DRIFT_POOL.indexOf(toName);
        const stop = SCENE_BY_NAME[toName];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        const nIdx = driftPick(toIdx);
        set({
          params: Object.assign({}, get().params, stepObj),
          _driftFrom: toName, _driftTo: DRIFT_POOL[nIdx],
          _driftSegStart: now, _driftSegDur: driftSegMs(),
          driftNow: toName, driftNext: DRIFT_POOL[nIdx],
          journeyPulse: { t0: ENGINE.ctx ? ENGINE.ctx.currentTime : 0 },
        });
        f = 0;
      }
      set({ driftProgress: f });
      const a = SCENE_BY_NAME[get()._driftFrom].p;
      const b = SCENE_BY_NAME[get()._driftTo].p;
      const e = easeInOut(f);
      const contObj = {};
      for (const k of JOURNEY_CONT_KEYS) {
        if (a[k] == null || b[k] == null) continue;
        const v = lerp(a[k], b[k], e);
        contObj[k] = v;
        ENGINE.set(k, v);
      }
      set({ params: Object.assign({}, get().params, contObj) });
    },
  };
}

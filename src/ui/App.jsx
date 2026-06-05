import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ENGINE } from '../engine/index.js';
import {
  tempoLabel, stutterLabel, bloomLabel, driftLabel, registerLabel, spaceLabel,
  colorLabel, evolveLabel, journeyLabel, texlevelLabel, glueLabel, binlevelLabel, pctLabel,
} from './labels.js';
import {
  BRAINWAVES, BREATH_PATTERNS, BREATH_ORDER, TUNINGS, SECTIONS, TEXTURES,
  KEYS, STR_KEYS, INT_KEYS, NUM_DEFAULTS,
  SCENES, SCENE_DIAL_KEYS, SCENE_BY_NAME,
  JOURNEYS, JOURNEY_STEP_KEYS, JOURNEY_CONT_KEYS,
  DRIFT_POOL, DRIFT_SEG_MIN, DRIFT_SEG_MAX, EXPORT_OPTS,
  SLEEP_OPTS, SLEEP_FADE, WAKE_OPTS, WAKE_RISE,
  SESSION_OPTS, INTERVAL_OPTS, SESSION_DUCK,
} from './constants.js';
import { readConfig, persist, readLibrary, writeLibrary, snapshotName, uid } from './persistence.js';
import {
  PlayIcon, PauseIcon, DiceIcon, LinkIcon, InstallIcon,
  FullscreenIcon, FullscreenExitIcon, VizIcon, ReturnIcon,
  SpeakerIcon, MoonIcon, BreathIcon, BellIcon, SlidersIcon,
  RouteIcon, InfoIcon, DownloadIcon, SunriseIcon, CloseIcon, SaveIcon, CubeIcon,
} from './icons.jsx';
import { drawGlyph, FAMILY_LABEL, MOOD_VIZ, GlyphSVG } from './glyphs.jsx';
import { createRenderer } from './canvas.js';
import { createWebGLRenderer } from './webgl.js';
import { Dial } from './components/Dial.jsx';
import { Slider } from './components/Slider.jsx';

// ---- time-of-day helpers ----
function easeInOut(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))); }
function lerp(a, b, t) { return a + (b - a) * t; }
function driftSegMs() { return (DRIFT_SEG_MIN + Math.random() * (DRIFT_SEG_MAX - DRIFT_SEG_MIN)) * 1000; }
function driftPick(i) {
  const L = DRIFT_POOL.length;
  const steps = [-2, -1, 1, 2];
  const s = steps[Math.floor(Math.random() * steps.length)];
  let j = i + s;
  if (j < 0 || j > L - 1) j = i - s;
  j = Math.max(0, Math.min(L - 1, j));
  if (j === i) j = (i === 0) ? 1 : i - 1;
  return j;
}

function sceneForHour(h) {
  if (h >= 5 && h < 9)   return "Stillness";
  if (h >= 9 && h < 14)  return "Clear Mind";
  if (h >= 14 && h < 18) return "Quickening";
  if (h >= 18 && h < 22) return "Reverie";
  if (h >= 22 || h < 1)  return "Tide";
  return "Deep Rest";
}
function partOfDay(h) {
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}
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

// ---- Media Session helpers ----
function makeSilentAudio() {
  const a = document.createElement("audio");
  a.loop = true;
  a.preload = "auto";
  a.setAttribute("playsinline", "");
  const sr = 8000, len = sr;
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

// ---- main ------------------------------------------------------------
export default function App() {
  const saved = readConfig();
  const firstVisit = (() => {
    try { return !saved && !localStorage.getItem("loops.seen"); } catch (e) { return !saved; }
  })();
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
  const [immersive, setImmersive] = useState(true);
  const [vizMode, setVizMode] = useState("mandala"); // "mandala" | "space"
  const [vizUiVisible, setVizUiVisible] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [exportMin, setExportMin] = useState(2);
  const [exportState, setExportState] = useState("idle");
  const [exportPct, setExportPct] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { const v = localStorage.getItem("loops.volume"); return v != null ? +v : 0.85; } catch (e) { return 0.85; }
  });
  const [activeScene, setActiveScene] = useState(saved ? null : WELCOME.name);
  const [library, setLibrary] = useState(readLibrary);
  const [activeSaved, setActiveSaved] = useState(null);
  const [savedToast, setSavedToast] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [sleepDur, setSleepDur] = useState(0);
  const [sleepEnd, setSleepEnd] = useState(0);
  const [sleepRemain, setSleepRemain] = useState(0);
  const [wakeIn, setWakeIn] = useState(0);
  const [wakeAt, setWakeAt] = useState(0);
  const [wakeRising, setWakeRising] = useState(false);
  const [sessionPick, setSessionPick] = useState(() => {
    try { const v = localStorage.getItem("loops.session.dur"); return v != null ? +v : 10; } catch (e) { return 10; }
  });
  const [sessionInterval, setSessionInterval] = useState(() => {
    try { const v = localStorage.getItem("loops.session.interval"); return v != null ? +v : 0; } catch (e) { return 0; }
  });
  const [sessionEnd, setSessionEnd] = useState(0);
  const [sessionRemain, setSessionRemain] = useState(0);
  const nextBellRef = useRef(0);
  const sessionEndingRef = useRef(false);
  const sessionTotalRef = useRef(0);
  const [journey, setJourney] = useState(null);
  const [journeyRemain, setJourneyRemain] = useState(0);
  const [journeyStop, setJourneyStop] = useState(0);
  const journeyEndRef = useRef(0);
  const journeyStepRef = useRef(-1);
  const journeyFadingRef = useRef(false);
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
  const glCanvasRef = useRef(null);
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
  const emitRippleRef = useRef(null);
  const vizModeRef = useRef("mandala");
  const glRendererRef = useRef(null);
  const breathRingRef = useRef(null);
  const breathLabelRef = useRef(null);
  const breathCountRef = useRef(null);

  useEffect(() => {
    breathRef.current = breathOn;
    try { localStorage.setItem("loops.breath.on", breathOn ? "1" : "0"); } catch (e) {}
  }, [breathOn]);
  useEffect(() => {
    breathPatRef.current = breathPat;
    try { localStorage.setItem("loops.breath.pat", breathPat); } catch (e) {}
  }, [breathPat]);

  useEffect(() => { ENGINE.setParams(params); }, []); // eslint-disable-line
  useEffect(() => { persist(params); }, [params]);

  useEffect(() => {
    ENGINE.setVolume(volume);
    try { localStorage.setItem("loops.volume", String(volume)); } catch (e) {}
  }, [volume]);

  // sleep timer
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

  // wake timer
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
        setWakeIn(0); setWakeAt(0); setWakeRising(false);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [wakeAt, elapsed]);

  // session timer
  useEffect(() => {
    if (!sessionEnd) { setSessionRemain(0); return; }
    const tick = () => {
      const now = Date.now();
      const rem = Math.max(0, (sessionEnd - now) / 1000);
      setSessionRemain(rem);
      if (nextBellRef.current && sessionIntervalRef.current > 0 && now >= nextBellRef.current && rem > 15) {
        ENGINE.strikeBell({ octave: 1, vel: 0.78, decay: 7 });
        nextBellRef.current = now + sessionIntervalRef.current * 60000;
      }
      if (rem <= 0 && !sessionEndingRef.current) {
        sessionEndingRef.current = true;
        ENGINE.strikeBell({ vel: 1, decay: 12, delay: 0 });
        ENGINE.strikeBell({ vel: 0.92, decay: 12, delay: 3.4 });
        ENGINE.strikeBell({ vel: 0.86, decay: 13, delay: 6.8 });
        ENGINE.duckField(SESSION_DUCK);
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

  const cancelJourney = useCallback((opts) => {
    opts = opts || {};
    if (!journeyEndRef.current) return;
    journeyEndRef.current = 0;
    journeyStepRef.current = -1;
    journeyFadingRef.current = false;
    if (opts.silent !== true) ENGINE.cancelFade();
    setJourney(null);
    setJourneyRemain(0);
    setJourneyStop(0);
  }, []);

  // journey engine
  useEffect(() => {
    if (!journey) return;
    const stops = journey.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
    const N = stops.length;
    const totalSec = journey.total * 60;
    const segDur = totalSec / (N - 1);
    const FADE = 60;

    const tick = () => {
      const now = Date.now();
      const elapsedSec = totalSec - Math.max(0, (journeyEndRef.current - now) / 1000);
      const rem = Math.max(0, (journeyEndRef.current - now) / 1000);
      setJourneyRemain(rem);

      const rawSeg = Math.min(N - 1, Math.floor(elapsedSec / segDur + 1e-6));
      while (journeyStepRef.current < rawSeg) {
        journeyStepRef.current += 1;
        const stop = stops[journeyStepRef.current];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        setParams((prev) => Object.assign({}, prev, stepObj));
        setJourneyStop(journeyStepRef.current);
        journeyPulseRef.current = { t0: ENGINE.ctx ? ENGINE.ctx.currentTime : 0 };
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
      setParams((prev) => Object.assign({}, prev, contObj));

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
        setActiveScene(journey.stops[N - 1]);
        cancelJourney({ silent: true });
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [journey, cancelJourney]);

  useEffect(() => {
    const seen = [];
    for (const v of ENGINE.voices) if (seen.indexOf(v.family) < 0) seen.push(v.family);
    setFamilies(seen);
  }, [params]);

  useEffect(() => {
    immersiveRef.current = immersive;
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, [immersive]);

  useEffect(() => {
    if (!immersive) { setVizUiVisible(true); return; }
    setVizUiVisible(true);
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

  const setWake = useCallback((min) => {
    if (!min) {
      setWakeIn(0); setWakeAt(0); setWakeRising(false);
      ENGINE.cancelFade();
      return;
    }
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

  const beginSession = useCallback((min) => {
    if (!min) return;
    ENGINE.cancelFade(); setSleepDur(0); setSleepEnd(0);
    if (!ENGINE.playing) {
      ENGINE.play();
      startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0) - elapsed;
      setPlaying(true);
    } else {
      ENGINE.setLoopLevel(ENGINE.params.looplevel);
      ENGINE.setTextureLevel(ENGINE.params.texlevel);
    }
    sessionEndingRef.current = false;
    ENGINE.strikeBell({ vel: 1, decay: 11 });
    const now = Date.now();
    nextBellRef.current = sessionIntervalRef.current > 0 ? now + sessionIntervalRef.current * 60000 : 0;
    sessionTotalRef.current = min * 60;
    setSessionRemain(min * 60);
    setSessionEnd(now + min * 60000);
  }, [elapsed]);

  const endSession = useCallback(() => {
    sessionEndingRef.current = false;
    nextBellRef.current = 0;
    setSessionEnd(0);
    setSessionRemain(0);
  }, []);

  const beginJourney = useCallback((j) => {
    if (!j) return;
    cancelDrift();
    const stops = j.stops.map((n) => SCENE_BY_NAME[n]).filter(Boolean);
    if (stops.length < 2) return;
    ENGINE.cancelFade();
    setSleepDur(0); setSleepEnd(0);
    setSessionEnd(0); setSessionRemain(0); sessionEndingRef.current = false;

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

  const cancelDrift = useCallback(() => {
    if (!driftActiveRef.current) return;
    driftActiveRef.current = false;
    setDriftOn(false);
    setDriftNow(""); setDriftNext(""); setDriftProgress(0);
  }, []);

  const beginDrift = useCallback(() => {
    ENGINE.cancelFade();
    setSleepDur(0); setSleepEnd(0);
    setSessionEnd(0); setSessionRemain(0); sessionEndingRef.current = false;
    if (journeyEndRef.current) {
      journeyEndRef.current = 0; journeyStepRef.current = -1; journeyFadingRef.current = false;
      setJourney(null); setJourneyRemain(0); setJourneyStop(0);
    }
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

  const doExport = useCallback((minutes) => {
    setExportState((cur) => {
      if (cur === "rendering") return cur;
      return "rendering";
    });
    setExportPct(0);
    let p = 0;
    const ticker = setInterval(() => { p = Math.min(0.92, p + 0.04 + Math.random() * 0.05); setExportPct(p); }, 220);
    const sceneLabel = activeScene || activeSaved || ENGINE.params.ensemble;
    setTimeout(() => {
      ENGINE.renderOffline({ seconds: minutes * 60, params: ENGINE.params })
        .then((buf) => {
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
          const { AmbientEngine } = require('../engine/index.js');
          const blob = AmbientEngine.bufferToWav(buf);
          const safe = String(sceneLabel || "drift").replace(/[^\w\s-]/g, "").trim() || "drift";
          const fname = "The Drift - " + safe + " (" + minutes + "m).wav";
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

  // drift tick
  useEffect(() => {
    if (!driftOn) return;
    const tick = () => {
      const now = Date.now();
      let f = (now - driftSegStartRef.current) / driftSegDurRef.current;
      if (f >= 1) {
        const toName = driftToRef.current;
        const toIdx = DRIFT_POOL.indexOf(toName);
        const stop = SCENE_BY_NAME[toName];
        const stepObj = {};
        for (const k of JOURNEY_STEP_KEYS) if (k in stop.p) stepObj[k] = stop.p[k];
        ENGINE.setParams(Object.assign({}, ENGINE.params, stepObj));
        setParams((prev) => Object.assign({}, prev, stepObj));
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

  const begin = useCallback(() => {
    try { localStorage.setItem("loops.seen", "1"); } catch (e) {}
    ENGINE.play();
    startedAtRef.current = (ENGINE.ctx ? ENGINE.ctx.currentTime : 0);
    setPlaying(true);
    setImmersive(true);
    setWelcomeHiding(true);
    setTimeout(() => setShowWelcome(false), 950);
  }, []);

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

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!immersive && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [immersive]);

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

  useEffect(() => {
    if (!anchorRef.current) anchorRef.current = makeSilentAudio();
    const a = anchorRef.current;
    if (playing) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
    else a.pause();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }, [playing]);

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

  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
    const mName = ENGINE.MOODS ? ENGINE.MOODS[params.mood]?.name : "";
    const AE = ENGINE.constructor;
    const moodName2 = AE.MOODS && AE.MOODS[params.mood] ? AE.MOODS[params.mood].name : "Drift";
    const ensName2 = AE.ENSEMBLES && AE.ENSEMBLES[params.ensemble] ? AE.ENSEMBLES[params.ensemble].name : "";
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: activeScene || moodName2,
        artist: "The Drift — generative ambient",
        album: ensName2 + (ensName2 && moodName2 ? " · " : "") + moodName2,
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
      return { w: r.width, h: r.height, dpr };
    }
    let dim = resize();
    const onResize = () => { dim = resize(); };
    window.addEventListener("resize", onResize);

    const { emitRipple, draw: drawFrame } = createRenderer({
      ctx, canvas, engine: ENGINE, ripplesRef, levRef, bellSeenRef, bellPulseRef,
      journeyPulseRef, immersiveRef, breathRef, breathPatRef,
    });

    emitRippleRef.current = emitRipple;

    // throttle elapsed updates to ~2/s
    const lastElapRef = { current: 0 };
    function setElapsedThrottled(v) {
      if (Math.abs(v - lastElapRef.current) >= 1) { lastElapRef.current = v; setElapsed(v); }
    }

    function loop() {
      const audioNow = ENGINE.ctx ? ENGINE.ctx.currentTime : performance.now() / 1000;
      if (startedAtRef.current && ENGINE.playing) setElapsedThrottled(audioNow - startedAtRef.current);
      // the 2D renderer always runs: it advances voice progress, strikes and
      // levels that the WebGL "space" view also reads each frame.
      drawFrame(dim);
      if (vizModeRef.current === "space" && immersiveRef.current && glCanvasRef.current) {
        if (!glRendererRef.current) {
          glRendererRef.current = createWebGLRenderer({ canvas: glCanvasRef.current, engine: ENGINE, levRef });
        }
        if (glRendererRef.current) glRendererRef.current.draw(dim);
        // the 2D mandala draws its own breath guide; in 3D that canvas is
        // hidden, so drive a DOM breath overlay from the same timing here.
        if (breathRef.current && breathRingRef.current) {
          const pat = BREATH_PATTERNS[breathPatRef.current] || BREATH_PATTERNS.calm;
          let pos = audioNow % pat.total;
          let phase = pat.seq[0], local = 0;
          for (let k = 0; k < pat.seq.length; k++) {
            if (pos < pat.seq[k].d) { phase = pat.seq[k]; local = pos / pat.seq[k].d; break; }
            pos -= pat.seq[k].d;
          }
          const ease = phase.s0 === phase.s1
            ? phase.s0
            : phase.s0 + (phase.s1 - phase.s0) * (0.5 - 0.5 * Math.cos(local * Math.PI));
          breathRingRef.current.style.transform = "translate(-50%,-50%) scale(" + (0.42 + ease * 0.58).toFixed(3) + ")";
          if (breathLabelRef.current) breathLabelRef.current.textContent = phase.label;
          if (breathCountRef.current) breathCountRef.current.textContent = String(Math.max(1, Math.ceil(phase.d - local * phase.d)));
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (glRendererRef.current) { glRendererRef.current.destroy(); glRendererRef.current = null; }
    };
  }, []);

  // keep the loop's ref in sync with the vizMode state
  useEffect(() => { vizModeRef.current = vizMode; }, [vizMode]);

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ":" + String(ss).padStart(2, "0");
  };
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

  const AE = ENGINE.constructor;
  const moodName = AE.MOODS && AE.MOODS[params.mood] ? AE.MOODS[params.mood].name : "";
  const ensembleName = AE.ENSEMBLES && AE.ENSEMBLES[params.ensemble] ? AE.ENSEMBLES[params.ensemble].name : "";
  const texSet = new Set((params.texture || "").split(".").filter(Boolean));

  return (
    <div className={"stage" + (immersive ? " immersive" : "") + (immersive && !vizUiVisible ? " hide-cursor" : "")}>
      <header className="head">
        <div className="head-left">
          <div className="eyebrow">Generative Ambient System</div>
          <h1 className="title">The Drift<em>.</em></h1>
          <p className="subtitle">
            Unequal loops, each a single held note, drifting endlessly in and
            out of phase &mdash; so the music never repeats.
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
        <canvas className={"field field-gl" + (vizMode === "space" && immersive ? " show" : "")} ref={glCanvasRef}></canvas>
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
                          title="Recall · double-click to rename">
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
                {AE.MOOD_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.mood === m ? " active" : "")}
                    onClick={() => update("mood", m)}>
                    {AE.MOODS[m].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mood-row">
              <span className="row-label">Ensemble</span>
              <div className="moods">
                {AE.ENSEMBLE_ORDER.map((m) => (
                  <button key={m}
                    className={"mood" + (params.ensemble === m ? " active" : "")}
                    onClick={() => update("ensemble", m)}>
                    {AE.ENSEMBLES[m].name}
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
                    title={b.hz ? b.hz + " · " + b.note : "Binaural beats off"}>
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
          <button className={"viz-chip mini" + (vizMode === "space" ? " active" : "")}
            onClick={() => setVizMode((m) => (m === "space" ? "mandala" : "space"))}
            aria-label={vizMode === "space" ? "Switch to mandala" : "Switch to 3D space"}
            title={vizMode === "space" ? "Mandala view" : "3D space view"}>
            {vizMode === "space" ? <VizIcon /> : <CubeIcon />}
          </button>
          <button className="viz-chip mini" onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Windowed" : "Fullscreen"}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </button>
        </div>
      )}

      {immersive && breathOn && vizMode === "space" && (
        <div className="breath-overlay" aria-hidden="true">
          <div className="breath-ring" ref={breathRingRef}></div>
          <div className="breath-cue">
            <span className="breath-label" ref={breathLabelRef}></span>
            <span className="breath-count" ref={breathCountRef}></span>
          </div>
        </div>
      )}

      {immersive && (
        <div className={"cast-caption" + (vizUiVisible ? " show" : "")}>
          <b>The Drift</b>
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
          <button className="dock-icon" onClick={() => setSheet((s) => (s === "info" ? null : "info"))} aria-label="About The Drift">
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
                <h2 className="info-title">The Drift<em>.</em></h2>
                <p className="info-sub">
                  Unequal loops, each a single held note, drifting endlessly in and out of phase
                  &mdash; so the music never repeats.
                </p>
                <p className="info-now">Now playing &middot; {ensembleName} &middot; {moodName}{activeScene ? " · " + activeScene : ""}</p>
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
                <div className="info-foot">{ensembleName} &middot; {moodName}{activeScene ? " · " + activeScene : ""} &middot; 44.1kHz stereo WAV</div>
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
            <h1 className="welcome-title">The Drift<em>.</em></h1>
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

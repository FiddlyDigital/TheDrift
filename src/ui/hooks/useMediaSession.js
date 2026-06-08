import { useEffect, useRef } from 'react';
import { ENGINE } from '../../engine/index.js';
import { MOOD_VIZ } from '../glyphs.jsx';
import { BRAINWAVES } from '../constants.js';
import { useDriftStore } from '../store/useDriftStore.js';

// A looping silent WAV keeps the page an active media source so lock-screen /
// hardware transport controls reach us even when the Web Audio graph is the
// only thing making sound.
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

export function useMediaSession() {
  const playing = useDriftStore((s) => s.playing);
  const activeScene = useDriftStore((s) => s.activeScene);
  const mood = useDriftStore((s) => s.params.mood);
  const ensemble = useDriftStore((s) => s.params.ensemble);
  const tuning = useDriftStore((s) => s.params.tuning);
  const binaural = useDriftStore((s) => s.params.binaural);
  const journey = useDriftStore((s) => s.journey);
  // timed-experience clocks, for the lock-screen progress scrubber
  const journeyEnd = useDriftStore((s) => s._journeyEnd);
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const sessionTotal = useDriftStore((s) => s._sessionTotal);
  const sleepEnd = useDriftStore((s) => s.sleepEnd);
  const sleepDur = useDriftStore((s) => s.sleepDur);
  const wakeAt = useDriftStore((s) => s.wakeAt);
  const wakeIn = useDriftStore((s) => s.wakeIn);
  const anchorRef = useRef(null);

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
    const toggle = () => useDriftStore.getState().toggle();
    set("play", () => { if (!ENGINE.playing) toggle(); });
    set("pause", () => { if (ENGINE.playing) toggle(); });
    set("stop", () => { if (ENGINE.playing) toggle(); });
    set("nexttrack", () => useDriftStore.getState().cycleScene(1));
    set("previoustrack", () => useDriftStore.getState().cycleScene(-1));
    return () => ["play", "pause", "stop", "nexttrack", "previoustrack"].forEach((k) => set(k, null));
  }, []);

  // The lock-screen / media-widget text, kept as a live read-out of the field:
  // scene or mood up top, the journey (if one is running) as the "artist", and a
  // descriptor line of ensemble · mood · tuning · brainwave band as the "album".
  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
    const AE = ENGINE.constructor;
    const moodName = AE.MOODS && AE.MOODS[mood] ? AE.MOODS[mood].name : "Drift";
    const ensName = AE.ENSEMBLES && AE.ENSEMBLES[ensemble] ? AE.ENSEMBLES[ensemble].name : "";
    const binName = (BRAINWAVES.find((b) => b.id === binaural) || {}).name;
    const parts = [ensName, moodName];
    if (tuning && tuning !== 440) parts.push(tuning + " Hz");
    if (binName && binaural !== "off") parts.push(binName);
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: activeScene || moodName,
        artist: journey ? "Journey · " + (journey.name || "Drift") : "The Drift — generative ambient",
        album: parts.filter(Boolean).join(" · "),
        artwork: makeArtwork(mood),
      });
    } catch (e) {}
  }, [activeScene, mood, ensemble, tuning, binaural, journey]);

  // Drive the OS media scrubber from whichever timed experience is running
  // (journey > session > sleep > wake), so the lock screen shows real elapsed /
  // remaining time. Cleared when none is active.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (typeof ms.setPositionState !== "function") return;
    let totalSec = 0, endMs = 0;
    if (journey && journeyEnd) { totalSec = (journey.total || 0) * 60; endMs = journeyEnd; }
    else if (sessionEnd) { totalSec = sessionTotal; endMs = sessionEnd; }       // already seconds
    else if (sleepEnd) { totalSec = sleepDur * 60; endMs = sleepEnd; }
    else if (wakeAt) { totalSec = wakeIn * 60; endMs = wakeAt; }
    const clear = () => { try { ms.setPositionState(); } catch (e) {} };
    if (!(totalSec > 0) || !endMs) { clear(); return; }
    const push = () => {
      const remain = Math.max(0, (endMs - Date.now()) / 1000);
      const position = Math.min(totalSec, Math.max(0, totalSec - remain));
      try { ms.setPositionState({ duration: totalSec, position, playbackRate: 1 }); } catch (e) {}
    };
    push();
    const id = setInterval(push, 1000);
    return () => { clearInterval(id); clear(); };
  }, [journey, journeyEnd, sessionEnd, sessionTotal, sleepEnd, sleepDur, wakeAt, wakeIn]);
}

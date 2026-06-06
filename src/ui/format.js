import { ENGINE } from '../engine/index.js';

// clock: seconds -> "m:ss"
export function fmt(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + String(ss).padStart(2, "0");
}

// human "time until" for wake/sleep status lines
export function fmtUntil(sec) {
  sec = Math.max(0, sec);
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h + "h" + (m ? " " + m + "m" : "");
  }
  if (sec >= 90) return Math.round(sec / 60) + "m";
  const mm = Math.floor(sec / 60), ss2 = Math.floor(sec % 60);
  return (mm ? mm + "m " : "") + ss2 + "s";
}

// display names for the current mood / ensemble
export function moodName(params) {
  const AE = ENGINE.constructor;
  return AE.MOODS && AE.MOODS[params.mood] ? AE.MOODS[params.mood].name : "";
}
export function ensembleName(params) {
  const AE = ENGINE.constructor;
  return AE.ENSEMBLES && AE.ENSEMBLES[params.ensemble] ? AE.ENSEMBLES[params.ensemble].name : "";
}

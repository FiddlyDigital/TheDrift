import { KEYS, STR_KEYS, INT_KEYS, NUM_DEFAULTS, EXPERT_KEYS } from './constants.js';
import { MOODS, ENSEMBLES } from '../engine/constants.js';

// an expert key is "in use" only when it differs from its default — used to
// keep ordinary share links free of Atelier noise
function expertActive(p, k) {
  if (STR_KEYS[k] != null) return (p[k] || "") !== (STR_KEYS[k] || "");
  return +p[k] !== NUM_DEFAULTS[k];
}

// ---- persistence -----------------------------------------------------
export function readConfig() {
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

export function persist(p) {
  try { localStorage.setItem("loops.config", JSON.stringify(p)); } catch (e) {}
  const sp = new URLSearchParams();
  for (const k of KEYS) {
    // skip default-valued expert keys so non-Atelier links stay clean
    if (EXPERT_KEYS.indexOf(k) >= 0 && !expertActive(p, k)) continue;
    if (STR_KEYS[k] != null || INT_KEYS[k]) sp.set(k, p[k]);
    else sp.set(k, (+p[k]).toFixed(2));
  }
  history.replaceState(null, "", "#" + sp.toString());
}

// ---- personal library: keep the drifts you love ---------------------
const LIB_KEY = "loops.library";
export function readLibrary() {
  try { const s = localStorage.getItem(LIB_KEY); return s ? JSON.parse(s) : []; }
  catch (e) { return []; }
}
export function writeLibrary(list) {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch (e) {}
}
export function snapshotName(p) {
  const mood = MOODS[p.mood] ? MOODS[p.mood].name : "Drift";
  const ens = ENSEMBLES[p.ensemble] ? ENSEMBLES[p.ensemble].name : "";
  return ens ? mood + " · " + ens : mood;
}
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

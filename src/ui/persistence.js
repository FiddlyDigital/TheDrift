import { KEYS, STR_KEYS, INT_KEYS, NUM_DEFAULTS, EXPERT_KEYS } from './constants.js';
import { MOODS, ENSEMBLES } from '../engine/constants.js';
import { lsGetJson, lsSetJson } from './store/storage.js';

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
    const cfg = lsGetJson("loops.config", null);
    return cfg;
  }
  const cfg = {};
  for (const k of KEYS) {
    if (STR_KEYS[k] != null) cfg[k] = out[k] || STR_KEYS[k];
    else cfg[k] = out[k] != null && out[k] !== "" ? +out[k] : NUM_DEFAULTS[k];
  }
  return cfg;
}

export function persist(p) {
  lsSetJson("loops.config", p);
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
  return lsGetJson(LIB_KEY, []);
}
export function writeLibrary(list) {
  lsSetJson(LIB_KEY, list);
}
export function snapshotName(p) {
  const mood = MOODS[p.mood] ? MOODS[p.mood].name : "Drift";
  const ens = ENSEMBLES[p.ensemble] ? ENSEMBLES[p.ensemble].name : "";
  return ens ? mood + " · " + ens : mood;
}
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

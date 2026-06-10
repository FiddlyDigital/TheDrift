import { ENGINE } from '../../engine/index.js';
import { createMidiManager, isMidiSupported, parseMidi } from '../midi.js';
import { lsGetJson, lsSetJson, lsSet } from './storage.js';

const upd = (v, prev) => (typeof v === 'function' ? v(prev) : v);

// ---- MIDI-mappable controls (Atelier) ----
// "range" controls bind to a CC (knob/fader); "action" controls bind to a CC
// (triggered at value >= 64) or a Note (triggered on note-on).
// Grouped/ordered to mirror the control tabs (Transport · Scenes · Motion ·
// Space · Mixer) so a knob is easy to find. Every continuous dial in those
// tabs has a row here; the discrete chip groups (Mood, Ensemble, Tuning,
// Ambience, Brainwaves) aren't CC-mappable.
export const MIDI_CONTROLS = [
  { id: "play", label: "Play / Pause", kind: "action", group: "Transport" },
  { id: "start", label: "Start", kind: "action", group: "Transport" },
  { id: "stop", label: "Stop", kind: "action", group: "Transport" },
  { id: "nextScene", label: "Next scene", kind: "action", group: "Scenes" },
  { id: "prevScene", label: "Prev scene", kind: "action", group: "Scenes" },
  { id: "reshuffle", label: "Reshuffle", kind: "action", group: "Scenes" },
  { id: "density", label: "Density", kind: "range", group: "Motion" },
  { id: "tempo", label: "Tempo", kind: "range", group: "Motion" },
  { id: "drift", label: "Drift", kind: "range", group: "Motion" },
  { id: "register", label: "Register", kind: "range", group: "Motion" },
  { id: "evolve", label: "Evolve", kind: "range", group: "Motion" },
  { id: "journey", label: "Journey", kind: "range", group: "Motion" },
  { id: "space", label: "Space", kind: "range", group: "Space" },
  { id: "color", label: "Color", kind: "range", group: "Space" },
  { id: "bloom", label: "Bloom", kind: "range", group: "Space" },
  { id: "stutter", label: "Stutter", kind: "range", group: "Space" },
  { id: "volume", label: "Master volume", kind: "range", group: "Mixer" },
  { id: "looplevel", label: "Loops level", kind: "range", group: "Mixer" },
  { id: "texlevel", label: "Ambience level", kind: "range", group: "Mixer" },
  { id: "binlevel", label: "Beat level", kind: "range", group: "Mixer" },
  { id: "glue", label: "Glue", kind: "range", group: "Mixer" },
  { id: "sidechain", label: "Sidechain", kind: "range", group: "Mixer" },
];
export const MIDI_CONTROL_BY_ID = {};
MIDI_CONTROLS.forEach((c) => { MIDI_CONTROL_BY_ID[c.id] = c; });

// Web MIDI mapping (Atelier): learn a control by binding the next message, then
// route incoming CC/notes to their mapped controls.
export function createMidiSlice(set, get) {
  let manager = null;
  const persistMap = (m) => lsSetJson("loops.midimap", m);
  const initMap = lsGetJson("loops.midimap", {});

  return {
    midiSupported: isMidiSupported(),
    midiEnabled: false,
    midiInputs: [],
    midiLearn: null,         // controlId being learned
    midiMap: initMap,

    setMidiLearn: (v) => set({ midiLearn: upd(v, get().midiLearn) }),
    setMidiMap: (v) => { const m = upd(v, get().midiMap); persistMap(m); set({ midiMap: m }); },
    clearMidiBinding: (id) => {
      const m = Object.assign({}, get().midiMap);
      delete m[id];
      persistMap(m);
      set({ midiMap: m });
    },

    enableMidi: async () => {
      if (!isMidiSupported()) return;
      if (!manager) manager = createMidiManager((data) => get().onMidi(data), (ins) => set({ midiInputs: ins }));
      try {
        const ins = await manager.enable();
        set({ midiInputs: ins, midiEnabled: true });
        lsSet("loops.midi", "1");
      } catch (e) { console.warn("MIDI enable failed:", e); }
    },

    onMidi: (data) => {
      const msg = parseMidi(data);
      if (!msg) return;
      const learn = get().midiLearn;
      if (learn) {
        const m = Object.assign({}, get().midiMap, { [learn]: { type: msg.type, number: msg.number } });
        persistMap(m);
        set({ midiMap: m, midiLearn: null });
        return;
      }
      const map = get().midiMap;
      for (const id in map) {
        const b = map[id];
        if (b && b.type === msg.type && b.number === msg.number) get().applyMidi(id, msg);
      }
    },

    applyMidi: (id, msg) => {
      const c = MIDI_CONTROL_BY_ID[id];
      if (!c) return;
      if (c.kind === "range") {
        if (msg.type !== "cc") return;
        const v = msg.value / 127;
        if (id === "density") get().update("density", Math.max(2, Math.min(12, Math.round(2 + v * 10))));
        else if (id === "volume") get().setVolume(v);
        else get().update(id, v);
      } else {
        const on = msg.type === "note" ? true : msg.value >= 64;
        if (!on) return;
        if (id === "play") get().toggle();
        else if (id === "start") { if (!ENGINE.playing) get().toggle(); }
        else if (id === "stop") { if (ENGINE.playing) get().toggle(); }
        else if (id === "reshuffle") get().reshuffle();
        else if (id === "nextScene") get().cycleScene(1);
        else if (id === "prevScene") get().cycleScene(-1);
      }
    },
  };
}

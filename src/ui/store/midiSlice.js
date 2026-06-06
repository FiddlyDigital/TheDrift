import { ENGINE } from '../../engine/index.js';
import { createMidiManager, isMidiSupported, parseMidi } from '../midi.js';

const upd = (v, prev) => (typeof v === 'function' ? v(prev) : v);

// ---- MIDI-mappable controls (Atelier) ----
// "range" controls bind to a CC (knob/fader); "action" controls bind to a CC
// (triggered at value >= 64) or a Note (triggered on note-on).
export const MIDI_CONTROLS = [
  { id: "play", label: "Play / Pause", kind: "action" },
  { id: "start", label: "Start", kind: "action" },
  { id: "stop", label: "Stop", kind: "action" },
  { id: "volume", label: "Master volume", kind: "range" },
  { id: "looplevel", label: "Loops level", kind: "range" },
  { id: "texlevel", label: "Ambience level", kind: "range" },
  { id: "density", label: "Density", kind: "range" },
  { id: "tempo", label: "Tempo", kind: "range" },
  { id: "drift", label: "Drift", kind: "range" },
  { id: "register", label: "Register", kind: "range" },
  { id: "space", label: "Space", kind: "range" },
  { id: "color", label: "Color", kind: "range" },
  { id: "bloom", label: "Bloom", kind: "range" },
  { id: "stutter", label: "Stutter", kind: "range" },
  { id: "evolve", label: "Evolve", kind: "range" },
  { id: "journey", label: "Journey", kind: "range" },
  { id: "glue", label: "Glue", kind: "range" },
  { id: "reshuffle", label: "Reshuffle", kind: "action" },
  { id: "nextScene", label: "Next scene", kind: "action" },
  { id: "prevScene", label: "Prev scene", kind: "action" },
];
export const MIDI_CONTROL_BY_ID = {};
MIDI_CONTROLS.forEach((c) => { MIDI_CONTROL_BY_ID[c.id] = c; });

// Web MIDI mapping (Atelier): learn a control by binding the next message, then
// route incoming CC/notes to their mapped controls.
export function createMidiSlice(set, get) {
  let manager = null;
  const persistMap = (m) => { try { localStorage.setItem("loops.midimap", JSON.stringify(m)); } catch (e) {} };
  const initMap = (() => { try { return JSON.parse(localStorage.getItem("loops.midimap") || "{}"); } catch (e) { return {}; } })();

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
      if (!manager) manager = createMidiManager((data) => get().onMidi(data));
      try {
        const ins = await manager.enable();
        set({ midiInputs: ins, midiEnabled: true });
        try { localStorage.setItem("loops.midi", "1"); } catch (e) {}
      } catch (e) { /* permission denied / unsupported */ }
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

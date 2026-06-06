import { ENGINE } from '../../engine/index.js';
import { KEYS } from '../constants.js';
import { readLibrary, writeLibrary, snapshotName, uid } from '../persistence.js';

const upd = (v, prev) => (typeof v === 'function' ? v(prev) : v);

// The "Yours" library: snapshots of the current sound the listener can save,
// recall, rename and delete. Persisted via persistence.writeLibrary.
export function createLibrarySlice(set, get) {
  let saveT;
  return {
    library: readLibrary(),
    savedToast: false,
    renamingId: null,

    setRenamingId: (v) => set({ renamingId: upd(v, get().renamingId) }),

    saveCurrent: () => {
      const p = {};
      for (const k of KEYS) p[k] = get().params[k];
      const item = { id: uid(), name: get().activeScene || snapshotName(p), params: p, savedAt: Date.now() };
      const next = [item, ...get().library].slice(0, 24);
      writeLibrary(next);
      set({ library: next, activeSaved: item.id, savedToast: true });
      clearTimeout(saveT);
      saveT = setTimeout(() => set({ savedToast: false }), 1900);
    },

    recallSaved: (item) => {
      get().cancelJourney();
      get().cancelDrift();
      set({ params: Object.assign({}, get().params, item.params) });
      ENGINE.setParams(Object.assign({}, ENGINE.params, item.params));
      set({ activeScene: null, activeSaved: item.id });
      if (!ENGINE.playing) get()._play();
    },

    deleteSaved: (id) => {
      const next = get().library.filter((x) => x.id !== id);
      writeLibrary(next);
      set({ library: next });
      if (get().activeSaved === id) set({ activeSaved: null });
      if (get().renamingId === id) set({ renamingId: null });
    },

    renameSaved: (id, name) => {
      const clean = (name || "").trim();
      const next = get().library.map((x) => (x.id === id && clean) ? Object.assign({}, x, { name: clean }) : x);
      writeLibrary(next);
      set({ library: next, renamingId: null });
    },
  };
}

import { create } from 'zustand';
import { readConfig } from '../persistence.js';
import { SCENES } from '../constants.js';
import { defaultScene } from './util.js';
import { createCoreSlice } from './coreSlice.js';
import { createUiSlice } from './uiSlice.js';
import { createLibrarySlice } from './librarySlice.js';
import { createExportSlice } from './exportSlice.js';
import { createMidiSlice } from './midiSlice.js';

// Single Zustand store for the whole app, composed of cohesive slices. Actions
// cross-call through get(), which models the tight coupling between concerns
// (e.g. editing a param cancels any running journey/drift). Components select
// the slices they need; effect hooks read non-reactively via getState().
export const useDriftStore = create((set, get) => {
  const saved = readConfig();
  const init = { saved, WELCOME: saved ? SCENES[0] : defaultScene() };
  return {
    ...createCoreSlice(set, get, init),
    ...createUiSlice(set, get, init),
    ...createLibrarySlice(set, get, init),
    ...createExportSlice(set, get, init),
    ...createMidiSlice(set, get, init),
  };
});

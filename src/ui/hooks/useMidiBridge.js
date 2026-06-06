import { useEffect } from 'react';
import { isMidiSupported } from '../midi.js';
import { useDriftStore } from '../store/useDriftStore.js';

// Re-attempt enabling MIDI if it was on last session (the browser permission
// persists). The manager creation + message routing lives in the midi slice.
export function useMidiBridge() {
  useEffect(() => {
    let on = false;
    try { on = localStorage.getItem("loops.midi") === "1"; } catch (e) {}
    if (on && isMidiSupported()) useDriftStore.getState().enableMidi();
  }, []);
}

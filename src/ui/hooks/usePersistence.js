import { useEffect } from 'react';
import { ENGINE } from '../../engine/index.js';
import { persist } from '../persistence.js';
import { useDriftStore } from '../store/useDriftStore.js';

// Bridges store state to the engine and to durable storage: one-time engine
// init + journey callback, and persistence of params (URL hash + localStorage)
// plus legend-family refresh whenever the sound changes.
export function usePersistence() {
  const params = useDriftStore((s) => s.params);

  useEffect(() => {
    const st = useDriftStore.getState();
    ENGINE.setParams(st.params);
    ENGINE.setVolume(st.volume);
    ENGINE.setSpatial(st.spatial);
    ENGINE.setBeatMode(st.beatmode);
    ENGINE.setBreathActive(st.breathOn && st.breathAudible);
    ENGINE.onJourney = (info) => useDriftStore.getState().onJourneyInfo(info);
    return () => { ENGINE.onJourney = null; };
  }, []);

  useEffect(() => {
    persist(params);
    useDriftStore.getState().refreshFamilies();
  }, [params]);
}

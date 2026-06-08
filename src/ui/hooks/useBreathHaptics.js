import { useEffect, useRef } from 'react';
import { ENGINE } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';
import { getBreathPattern } from '../constants.js';
import { breathPhaseIndexAt, vibrationPattern } from '../breathHaptics.js';

// Gentle vibration at each breath-phase change, so the breath guide can be
// followed eyes-closed on a phone. Default off; strength scales the pulse. Reads
// the same time base and pattern as the visual pacer so they stay in lock-step.
// No-ops where the Vibration API is unavailable (most desktops, iOS Safari).
export function useBreathHaptics() {
  const breathOn = useDriftStore((s) => s.breathOn);
  const haptics = useDriftStore((s) => s.haptics);
  const strength = useDriftStore((s) => s.hapticStrength);
  const breathPat = useDriftStore((s) => s.breathPat);
  const breathRate = useDriftStore((s) => s.breathRate);
  const lastIdx = useRef(-1);

  useEffect(() => {
    if (!breathOn || !haptics) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    lastIdx.current = -1;
    const tick = () => {
      if (!ENGINE.playing || !ENGINE.ctx) return;
      const pat = getBreathPattern(breathPat, breathRate);
      const idx = breathPhaseIndexAt(pat, ENGINE.ctx.currentTime);
      if (idx === lastIdx.current) return;
      const first = lastIdx.current === -1;
      lastIdx.current = idx;
      if (!first) {
        try { navigator.vibrate(vibrationPattern(pat.seq[idx].label, strength)); } catch (e) {}
      }
    };
    const id = setInterval(tick, 90);
    return () => { clearInterval(id); try { navigator.vibrate(0); } catch (e) {} };
  }, [breathOn, haptics, strength, breathPat, breathRate]);
}

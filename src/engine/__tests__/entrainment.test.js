import { describe, it, expect } from 'vitest';
import AmbientEngine from '../AmbientEngine.js';

// The audio graph needs a real AudioContext (absent in the test env), so these
// cover the contract that doesn't: defaults and no-throw safety without a ctx.
describe('beat mode + breath engine API', () => {
  it('beat mode defaults to binaural and switches without a context', () => {
    const eng = new AmbientEngine();
    expect(() => eng.setBeatMode('isochronic')).not.toThrow();
    expect(eng._beatmode).toBe('isochronic');
    expect(() => eng.setBeatMode('monaural')).not.toThrow();
    expect(() => eng.setBeatMode('bogus')).not.toThrow(); // coerced to binaural
    expect(eng._beatmode).toBe('binaural');
    expect(eng.ctx).toBeFalsy();
  });

  it('breath controls are safe no-ops without a context', () => {
    const eng = new AmbientEngine();
    expect(() => eng.setBreathActive(true)).not.toThrow();
    expect(eng._breathActive).toBe(true);
    expect(() => eng.setBreathPhase(0.7)).not.toThrow(); // no ctx -> bails
    expect(() => eng.setBreathActive(false)).not.toThrow();
  });
});

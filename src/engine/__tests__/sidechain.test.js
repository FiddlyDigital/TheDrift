import { describe, it, expect } from 'vitest';
import AmbientEngine from '../AmbientEngine.js';

// The audio path needs a real AudioContext (not available in the test env), so
// these cover the parts that don't: the default and the live-update contract.
describe('sidechain param', () => {
  it('defaults to 0 (feature off, sound unchanged)', () => {
    const eng = new AmbientEngine();
    expect(eng.params.sidechain).toBe(0);
  });

  it('set() updates it live without needing a rebuild/context', () => {
    const eng = new AmbientEngine();           // no ensureContext() -> no ctx
    eng.set('sidechain', 0.5);
    expect(eng.params.sidechain).toBe(0.5);    // applied
    expect(eng.ctx).toBeFalsy();               // and it short-circuited before any audio work
  });

  it('_duck is a no-op when the amount is 0 (and safe with no context)', () => {
    const eng = new AmbientEngine();
    expect(() => eng._duck(0, 1, 60)).not.toThrow();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ganzfeldVisualAt, ganzfeldPhaseAt, ganzfeldStrobeLum,
  GANZFELD_PROGRAM, GANZFELD_BASE_HUE, GANZFELD_STROBE_DEPTH,
  GANZFELD_STROBE_AT_SEC, GANZFELD_ACCLIM_SEC,
} from '../constants.js';

// ---- pure timeline math (the renderer + tick read exactly these) ----------
describe('ganzfeldPhaseAt', () => {
  it('steps through the four phases by elapsed minutes', () => {
    expect(ganzfeldPhaseAt(0)).toBe(0);
    expect(ganzfeldPhaseAt(4 * 60)).toBe(0);
    expect(ganzfeldPhaseAt(5 * 60)).toBe(1);
    expect(ganzfeldPhaseAt(14 * 60)).toBe(1);
    expect(ganzfeldPhaseAt(15 * 60)).toBe(2);
    expect(ganzfeldPhaseAt(25 * 60)).toBe(3);
    expect(ganzfeldPhaseAt(99 * 60)).toBe(3);   // the deep phase holds
  });
});

describe('ganzfeldVisualAt', () => {
  it('holds the base hue through acclimation, then drifts continuously', () => {
    expect(ganzfeldVisualAt(0).hue).toBeCloseTo(GANZFELD_BASE_HUE, 5);
    expect(ganzfeldVisualAt(GANZFELD_ACCLIM_SEC).hue).toBeCloseTo(GANZFELD_BASE_HUE, 5);
    const a = ganzfeldVisualAt(GANZFELD_ACCLIM_SEC + 30).hue;
    const b = ganzfeldVisualAt(GANZFELD_ACCLIM_SEC + 60).hue;
    expect(a).toBeGreaterThan(GANZFELD_BASE_HUE);
    expect(b).toBeGreaterThan(a);
    expect(ganzfeldVisualAt(99999).hue).toBeGreaterThanOrEqual(0);  // wraps, stays finite
    expect(ganzfeldVisualAt(99999).hue).toBeLessThan(360);
  });

  it('interpolates the visual scalars and ramps grain in by the deep phase', () => {
    expect(ganzfeldVisualAt(0).grain).toBe(0);
    const mid = ganzfeldVisualAt(600);   // between the 300s and 900s keyframes
    expect(mid.grain).toBeGreaterThan(0);
    expect(mid.grain).toBeLessThan(0.6);
    expect(ganzfeldVisualAt(1500).grain).toBeCloseTo(1, 5);
    // every field stays in a sane, gentle range
    const v = ganzfeldVisualAt(1500);
    expect(v.light).toBeGreaterThan(0); expect(v.light).toBeLessThan(0.3);
    expect(v.vig).toBeGreaterThan(0); expect(v.vig).toBeLessThanOrEqual(1);
  });

  it('keeps the flicker envelope at zero until the deep phase, then fades it in', () => {
    expect(ganzfeldVisualAt(GANZFELD_STROBE_AT_SEC - 1).strobe).toBe(0);
    expect(ganzfeldVisualAt(GANZFELD_STROBE_AT_SEC).strobe).toBe(0);
    expect(ganzfeldVisualAt(GANZFELD_STROBE_AT_SEC + 10).strobe).toBeCloseTo(0.5, 5);
    expect(ganzfeldVisualAt(GANZFELD_STROBE_AT_SEC + 40).strobe).toBe(1);
  });
});

describe('ganzfeldStrobeLum (photosensitivity gate)', () => {
  it('is silent unless explicitly allowed and reduce-motion is off', () => {
    expect(ganzfeldStrobeLum(false, 0.25, false)).toBe(0);
    expect(ganzfeldStrobeLum(true, 0.25, true)).toBe(0);   // reduce-motion wins
  });
  it('oscillates within the bounded depth cap when allowed', () => {
    let max = 0;
    for (let t = 0; t < 1; t += 0.001) max = Math.max(max, Math.abs(ganzfeldStrobeLum(true, t, false)));
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(GANZFELD_STROBE_DEPTH + 1e-9);
  });
});

// ---- store: transport coupling + reversibility ----------------------------
vi.mock('../../engine/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  const eng = new actual.AmbientEngine();
  eng.ctx = { currentTime: 0 };
  eng.ensureContext = () => {};
  eng.play = vi.fn(() => { eng.playing = true; });
  eng.pause = vi.fn(() => { eng.playing = false; });
  eng.set = vi.fn();
  eng.setParams = vi.fn((p) => { Object.assign(eng.params, p); });
  eng.setVolume = vi.fn();
  eng.cancelFade = vi.fn();
  eng.silenceFade = vi.fn();
  eng.setLoopLevel = vi.fn();
  eng.setBinaural = vi.fn();
  eng.setBinLevel = vi.fn();
  eng.setTextures = vi.fn();
  eng.setTextureLevel = vi.fn();
  return { ...actual, ENGINE: eng };
});

import { useDriftStore } from '../store/useDriftStore.js';
import { JOURNEYS } from '../constants.js';
import { ENGINE } from '../../engine/index.js';

const initialState = useDriftStore.getState();
const reset = () => useDriftStore.setState(initialState, true);
const st = () => useDriftStore.getState();

beforeEach(() => { reset(); vi.clearAllMocks(); ENGINE.playing = false; });

describe('beginGanzfeld', () => {
  it('takes over the view + mutes the loops, remembering the prior viz mode', () => {
    useDriftStore.setState({ vizMode: 'space' });
    st().beginGanzfeld({ strobe: false });
    expect(st().ganzfeld).toBe(GANZFELD_PROGRAM);
    expect(st().vizMode).toBe('ganzfeld');
    expect(st().immersive).toBe(true);
    expect(st()._prevVizMode).toBe('space');
    expect(ENGINE.play).toHaveBeenCalled();
    expect(ENGINE.setLoopLevel).toHaveBeenCalledWith(0);   // opening phase mutes loops
  });

  it('cancels any running journey/session (mutual exclusion)', () => {
    st().beginJourney(JOURNEYS[0]);
    expect(st().journey).toBeTruthy();
    st().beginGanzfeld({ strobe: false });
    expect(st().journey).toBeNull();
    expect(st().ganzfeld).toBeTruthy();
  });
});

describe('ganzfeldTick', () => {
  it('applies the live phase audio when the phase advances', () => {
    st().beginGanzfeld({ strobe: false });
    ENGINE.setBinaural.mockClear();
    // jump the clock six minutes in -> phase 1 (theta fades in)
    useDriftStore.setState({ _ganzfeldStartMs: Date.now() - 6 * 60000, ganzfeldPhase: 0 });
    st().ganzfeldTick();
    expect(st().ganzfeldPhase).toBe(1);
    expect(ENGINE.setBinaural).toHaveBeenCalledWith('theta');
  });
});

describe('cancelGanzfeld', () => {
  it('restores the prior view and the listener\'s audio, leaving params untouched', () => {
    useDriftStore.setState({
      vizMode: 'mandala',
      params: Object.assign({}, st().params, { looplevel: 0.8, binaural: 'alpha', binlevel: 0.3, texture: 'rain', texlevel: 0.4 }),
    });
    st().beginGanzfeld({ strobe: false });
    ENGINE.setLoopLevel.mockClear();
    st().cancelGanzfeld();
    expect(st().ganzfeld).toBeNull();
    expect(st().vizMode).toBe('mandala');
    expect(ENGINE.setLoopLevel).toHaveBeenCalledWith(0.8);     // restored, not muted
    expect(ENGINE.setBinaural).toHaveBeenCalledWith('alpha');
    // the share-able store params were never mutated by ganzfeld
    expect(st().params.looplevel).toBe(0.8);
    expect(st().params.binaural).toBe('alpha');
  });

  it('is the exit path when the listener edits a param mid-session', () => {
    st().beginGanzfeld({ strobe: false });
    expect(st().vizMode).toBe('ganzfeld');
    st().update('space', 0.5);
    expect(st().ganzfeld).toBeNull();
    expect(st().vizMode).toBe('mandala');
  });
});

// ---- ui: the moderated-flicker consent flow -------------------------------
describe('toggleGanzfeldStrobe', () => {
  it('prompts for consent on first enable, then enables after confirming', () => {
    expect(st().ganzfeldStrobe).toBe(false);
    st().toggleGanzfeldStrobe();
    expect(st().ganzfeldStrobePrompt).toBe(true);
    expect(st().ganzfeldStrobe).toBe(false);   // nothing flickers yet
    st().confirmGanzfeldStrobe();
    expect(st().ganzfeldStrobeConsented).toBe(true);
    expect(st().ganzfeldStrobe).toBe(true);
    expect(st().ganzfeldStrobePrompt).toBe(false);
  });

  it('toggles freely once consented, without re-prompting', () => {
    st().confirmGanzfeldStrobe();
    expect(st().ganzfeldStrobe).toBe(true);
    st().toggleGanzfeldStrobe();
    expect(st().ganzfeldStrobe).toBe(false);
    st().toggleGanzfeldStrobe();
    expect(st().ganzfeldStrobePrompt).toBe(false);   // consent already given
    expect(st().ganzfeldStrobe).toBe(true);
  });
});

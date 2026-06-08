// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../engine/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  const eng = new actual.AmbientEngine();
  eng.ensureContext = () => {};
  eng.play = vi.fn(() => { eng.playing = true; });
  eng.pause = vi.fn(() => { eng.playing = false; });
  eng.set = vi.fn();
  eng.setParams = vi.fn((p) => { Object.assign(eng.params, p); });
  eng.setVolume = vi.fn();
  eng.setSpatial = vi.fn();
  eng.cancelFade = vi.fn();
  eng.silenceFade = vi.fn();
  return { ...actual, ENGINE: eng };
});

import { useDriftStore } from '../store/useDriftStore.js';
import { JOURNEYS } from '../constants.js';
import { ENGINE } from '../../engine/index.js';

const initialState = useDriftStore.getState();
const reset = () => useDriftStore.setState(initialState, true);
const st = () => useDriftStore.getState();

beforeEach(() => { reset(); vi.clearAllMocks(); ENGINE.playing = false; });

describe('core slice coupling', () => {
  it('update() pushes to the engine and clears scene + saved selection', () => {
    useDriftStore.setState({ activeScene: 'Tide', activeSaved: 'abc' });
    st().update('space', 0.5);
    expect(ENGINE.set).toHaveBeenCalledWith('space', 0.5);
    expect(st().params.space).toBe(0.5);
    expect(st().activeScene).toBeNull();
    expect(st().activeSaved).toBeNull();
  });

  it('applyScene() selects a scene; a later update() clears it', () => {
    st().applyScene({ name: 'Clear Mind', p: { mood: 'reflection' } });
    expect(st().activeScene).toBe('Clear Mind');
    st().update('space', 0.2);
    expect(st().activeScene).toBeNull();
  });

  it('update() cancels a running journey', () => {
    st().beginJourney(JOURNEYS[0]);
    expect(st().journey).not.toBeNull();
    st().update('space', 0.3);
    expect(st().journey).toBeNull();
    expect(st()._journeyEnd).toBe(0);
  });

  it('beginDrift() starts and cancelDrift() resets drift state', () => {
    st().beginDrift();
    expect(st().driftOn).toBe(true);
    expect(st()._driftActive).toBe(true);
    expect(st().driftNow).toBeTruthy();
    st().cancelDrift();
    expect(st().driftOn).toBe(false);
    expect(st()._driftActive).toBe(false);
    expect(st().driftNow).toBe('');
  });

  it('setWake() cancels sleep, session, journey and drift', () => {
    st().beginJourney(JOURNEYS[0]);
    useDriftStore.setState({ sleepEnd: Date.now() + 1e6, sessionEnd: Date.now() + 1e6 });
    st().setWake(10);
    expect(st().sleepEnd).toBe(0);
    expect(st().sessionEnd).toBe(0);
    expect(st().journey).toBeNull();
    expect(st().driftOn).toBe(false);
    expect(st().wakeAt).toBeGreaterThan(0);
  });
});

describe('ui slice — haptics + entrain consent', () => {
  it('haptics setters persist and clamp strength to 0..1', () => {
    st().setHaptics(true);
    expect(st().haptics).toBe(true);
    expect(localStorage.getItem('loops.haptics')).toBe('1');
    st().setHapticStrength(2);
    expect(st().hapticStrength).toBe(1);
    st().setHapticStrength(-1);
    expect(st().hapticStrength).toBe(0);
    expect(localStorage.getItem('loops.haptics.str')).toBe('0');
  });

  it('entrain light asks for consent before the first enable, then remembers it', () => {
    localStorage.removeItem('loops.entrain.ok');
    useDriftStore.setState({ entrainViz: false, entrainConsented: false, entrainPrompt: false });

    // first enable only raises the prompt — nothing flickers yet
    st().toggleEntrainViz();
    expect(st().entrainViz).toBe(false);
    expect(st().entrainPrompt).toBe(true);

    // confirming enables it and records consent
    st().confirmEntrain();
    expect(st().entrainViz).toBe(true);
    expect(st().entrainConsented).toBe(true);
    expect(st().entrainPrompt).toBe(false);
    expect(localStorage.getItem('loops.entrain.ok')).toBe('1');

    // turning off is free; re-enabling no longer prompts
    st().toggleEntrainViz();
    expect(st().entrainViz).toBe(false);
    st().toggleEntrainViz();
    expect(st().entrainViz).toBe(true);
    expect(st().entrainPrompt).toBe(false);
  });
});

describe('midi routing', () => {
  it('a mapped range CC updates its param — including the newly-added Beat level', () => {
    useDriftStore.setState({ midiMap: { binlevel: { type: 'cc', number: 21 } } });
    st().onMidi([0xB0, 21, 64]);            // CC #21 -> ~0.5
    expect(ENGINE.set).toHaveBeenCalledWith('binlevel', 64 / 127);
    expect(st().params.binlevel).toBeCloseTo(64 / 127, 4);
  });
});

describe('theme', () => {
  it('toggleTheme flips paper<->midnight, persists, and reflects onto <html>', () => {
    expect(st().theme).toBe('paper');
    expect(document.documentElement.dataset.theme).toBeUndefined();

    st().toggleTheme();
    expect(st().theme).toBe('midnight');
    expect(localStorage.getItem('loops.theme')).toBe('midnight');
    expect(document.documentElement.dataset.theme).toBe('midnight');

    st().toggleTheme();
    expect(st().theme).toBe('paper');
    expect(localStorage.getItem('loops.theme')).toBe('paper');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

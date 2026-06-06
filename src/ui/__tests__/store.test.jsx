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

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../engine/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  const eng = new actual.AmbientEngine();
  eng.ensureContext = () => {};
  eng.play = vi.fn(() => { eng.playing = true; });
  eng.pause = vi.fn();
  eng.set = vi.fn();
  eng.setParams = vi.fn((p) => { Object.assign(eng.params, p); });
  eng.voices = [];
  return { ...actual, ENGINE: eng };
});

import { ENGINE, parseVoices } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';
import { ScaleEditor } from '../views/controls/atelier/ScaleEditor.jsx';
import { VoiceLoom } from '../views/controls/atelier/VoiceLoom.jsx';
import { MidiPanel } from '../views/controls/atelier/MidiPanel.jsx';

const initialState = useDriftStore.getState();
const st = () => useDriftStore.getState();

beforeEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  ENGINE.playing = false;
  ENGINE.voices = [];
  useDriftStore.setState(initialState, true);
});

describe('ScaleEditor', () => {
  it('picking a key flips the mood to custom and records the key', () => {
    const { container } = render(<ScaleEditor />);
    const keys = container.querySelector('.key-row').querySelectorAll('button');
    fireEvent.click(keys[2]); // D
    expect(st().params.mood).toBe('custom');
    expect(st().params.key).toBe(2);
    expect(ENGINE.set).toHaveBeenCalled();
  });

  it('toggling a note edits the custom scale', () => {
    const { container } = render(<ScaleEditor />);
    const chips = container.querySelector('.note-grid').querySelectorAll('button');
    fireEvent.click(chips[1]); // toggle degree 1
    expect(st().params.mood).toBe('custom');
    expect(st().params.scaleNotes).toBeTruthy();
  });
});

describe('VoiceLoom', () => {
  it('Capture field pins the live voices into editable loops', () => {
    ENGINE.voices = [
      { inst: 'piano', midi: 60, period: 12.0 },
      { inst: 'bell', midi: 67, period: 18.5 },
    ];
    render(<VoiceLoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Capture field' }));
    const specs = parseVoices(st().params.voices);
    expect(specs).toHaveLength(2);
    expect(specs[0].note).toBe(60);
  });

  it('Return to generative clears the loom', () => {
    useDriftStore.setState({ params: { ...st().params, voices: 'piano:60:12.0:0' } });
    render(<VoiceLoom />);
    fireEvent.click(screen.getByRole('button', { name: 'Return to generative' }));
    expect(st().params.voices).toBe('');
  });
});

describe('MidiPanel', () => {
  it('Learn arms a control and an incoming message binds it', () => {
    useDriftStore.setState({ midiEnabled: true, midiInputs: [] });
    render(<MidiPanel />);
    const firstRow = screen.getAllByRole('button', { name: 'Learn' })[0];
    fireEvent.click(firstRow);
    expect(st().midiLearn).toBeTruthy();
    const armed = st().midiLearn;

    st().onMidi([0xB0, 20, 100]); // CC #20
    expect(st().midiLearn).toBeNull();
    expect(st().midiMap[armed]).toEqual({ type: 'cc', number: 20 });
  });
});

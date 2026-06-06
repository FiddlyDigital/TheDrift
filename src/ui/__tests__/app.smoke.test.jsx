// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';

// Use the real AmbientEngine for shape + statics (MOODS/ENSEMBLES/INSTRUMENTS),
// but stub the methods that touch Web Audio so the UI can run headless.
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
  eng.regenerate = vi.fn();
  eng.strikeBell = vi.fn();
  eng.cancelFade = vi.fn();
  eng.sampleLevels = () => ({ level: 0, low: 0, high: 0 });
  eng.updateSpatial = vi.fn();
  eng.voices = [];
  return { ...actual, ENGINE: eng };
});

import App from '../App.jsx';
import { ENGINE } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';

// the store is a module singleton; snapshot its initial state and restore it
// before each test so state doesn't leak between tests
const initialState = useDriftStore.getState();

beforeEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
  vi.clearAllMocks();
  ENGINE.playing = false;
  useDriftStore.setState(initialState, true);
});

describe('App smoke (baseline behaviour to preserve)', () => {
  it('shows the welcome screen on a fresh visit', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Begin the drift/i })).toBeInTheDocument();
  });

  it('renders the curated scenes in the default Scenes panel', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Deep Rest' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Murmuration' })).toBeInTheDocument();
  });

  it('switches control sections via the tab bar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Voice' }));
    expect(screen.getByText('Ensemble')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Orchestra' })).toBeInTheDocument();
  });

  it('applying a scene calls the engine and marks it active', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: 'Clear Mind' });
    fireEvent.click(btn);
    expect(ENGINE.setParams).toHaveBeenCalled();
    expect(btn.className).toContain('active');
  });

  it('moving a dial pushes the change to the engine', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Space' }));
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '0.7' } });
    expect(ENGINE.set).toHaveBeenCalled();
  });

  it('opens the Journey sheet from the immersive dock and lists journeys', () => {
    useDriftStore.setState({ showWelcome: false });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Journey/ }));
    expect(screen.getByText('Journeys')).toBeInTheDocument();
    expect(screen.getByText('Endless Drift')).toBeInTheDocument();
  });

  it('opens the Session sheet with length options', () => {
    useDriftStore.setState({ showWelcome: false });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Session/ }));
    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin .*session/i })).toBeInTheDocument();
  });

  it('renders the live session sheet (progress bar) without crashing', () => {
    useDriftStore.setState({
      showWelcome: false, sheet: 'session',
      sessionEnd: Date.now() + 600000, sessionRemain: 600, _sessionTotal: 600,
    });
    render(<App />);
    expect(screen.getByRole('button', { name: 'End session' })).toBeInTheDocument();
  });

  it('unlocks Atelier after three taps on the title', () => {
    const { container } = render(<App />);
    const title = container.querySelector('h1.title');
    fireEvent.click(title); fireEvent.click(title); fireEvent.click(title);
    expect(screen.getByRole('tab', { name: 'Atelier' })).toBeInTheDocument();
  });
});

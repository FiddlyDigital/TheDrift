// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';

vi.mock('../../engine/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  const eng = new actual.AmbientEngine();
  eng.ensureContext = () => {};
  eng.play = vi.fn(() => { eng.playing = true; });
  eng.pause = vi.fn();
  return { ...actual, ENGINE: eng };
});

import { AmbientEngine, ENGINE } from '../../engine/index.js';
import { Scopes } from '../views/controls/atelier/Scopes.jsx';

beforeEach(() => { cleanup(); vi.clearAllMocks(); ENGINE.ctx = null; ENGINE.playing = false; });

// jsdom returns a null 2D context, so useScopes no-ops — the component must
// still mount and the Show/Hide toggle must add/remove the canvases cleanly.
describe('Scopes component', () => {
  it('is hidden by default — no canvases until shown', () => {
    const { container } = render(<Scopes />);
    expect(container.querySelectorAll('canvas.scope-canvas').length).toBe(0);
    expect(screen.getByRole('button', { name: 'Show' })).toBeTruthy();
  });

  it('Show mounts the two scopes; Hide removes them without crashing', () => {
    const { container } = render(<Scopes />);
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(container.querySelectorAll('canvas.scope-canvas').length).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(container.querySelectorAll('canvas.scope-canvas').length).toBe(0);
  });

  // regression: the setup effect must re-run when the canvases appear. Ref
  // identity is stable, so keying the effect only on the refs left it never
  // running on Show (black boxes). It must key off the open/enabled flag.
  it('starts the scope loop when shown (not just on first mount)', () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    render(<Scopes />);
    spy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(spy).toHaveBeenCalled();   // effect re-ran and reached canvas setup
    spy.mockRestore();
  });
});

describe('engine getScopeAnalysers', () => {
  it('returns null when there is no audio context', () => {
    const e = new AmbientEngine();
    expect(e.getScopeAnalysers()).toBeNull();
  });

  it('is lazy: having a context never builds the taps until called', () => {
    // mirrors offline WAV export, which gets a context via ensureContext but
    // never calls getScopeAnalysers — so the scope nodes must not exist.
    const e = new AmbientEngine();
    e.ctx = {};            // a context is present...
    e.fade = { connect: vi.fn() };
    expect(e._scope).toBeNull();   // ...but nothing was built
  });

  it('builds {spec,left,right} once and caches (idempotent)', () => {
    const e = new AmbientEngine();
    let nAna = 0, nSplit = 0;
    const fakeAnalyser = () => ({ fftSize: 0, smoothingTimeConstant: 0, connect: vi.fn() });
    e.ctx = {
      createAnalyser: () => { nAna++; return fakeAnalyser(); },
      createChannelSplitter: () => { nSplit++; return { connect: vi.fn() }; },
      createGain: () => ({ gain: { value: 1 }, connect: vi.fn() }),
      destination: {},
    };
    e.fade = { connect: vi.fn() };

    const s1 = e.getScopeAnalysers();
    const s2 = e.getScopeAnalysers();
    expect(s1).toBe(s2);                 // cached
    expect(s1).toHaveProperty('spec');
    expect(s1).toHaveProperty('left');
    expect(s1).toHaveProperty('right');
    expect(nAna).toBe(3);                // spec + left + right, built exactly once
    expect(nSplit).toBe(1);
    expect(s1.spec.fftSize).toBe(2048);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { tapToField } from '../playAlong.js';
import { poolNote } from '../../engine/index.js';
import { useDriftStore } from '../store/useDriftStore.js';
import { Dock } from '../views/immersive/Dock.jsx';

describe('tapToField (X/Y -> musical params)', () => {
  it('maps the top of the canvas to the highest pitch, bottom to lowest', () => {
    expect(tapToField(50, 0, 100, 200).pitch01).toBeCloseTo(1);    // top
    expect(tapToField(50, 200, 100, 200).pitch01).toBeCloseTo(0);  // bottom
    expect(tapToField(50, 100, 100, 200).pitch01).toBeCloseTo(0.5);
  });
  it('maps horizontal position to stereo pan, centered at 0', () => {
    expect(tapToField(0, 10, 100, 200).pan).toBeCloseTo(-1);   // left edge
    expect(tapToField(100, 10, 100, 200).pan).toBeCloseTo(1);  // right edge
    expect(tapToField(50, 10, 100, 200).pan).toBeCloseTo(0);   // center
  });
  it('clamps out-of-bounds taps', () => {
    const r = tapToField(-30, 400, 100, 200);
    expect(r.pan).toBe(-1);
    expect(r.pitch01).toBe(0);
  });
});

describe('poolNote (pitch01 -> in-scale midi)', () => {
  const pool = [48, 50, 52, 55, 57, 60];
  it('picks the lowest at 0 and highest at 1', () => {
    expect(poolNote(pool, 0)).toBe(48);
    expect(poolNote(pool, 1)).toBe(60);
  });
  it('rounds to the nearest pool index and clamps', () => {
    expect(poolNote(pool, 0.5)).toBe(pool[Math.round(0.5 * 5)]);
    expect(poolNote(pool, 2)).toBe(60);
    expect(poolNote(pool, -1)).toBe(48);
  });
  it('returns null for an empty pool', () => {
    expect(poolNote([], 0.5)).toBeNull();
  });
});

describe('play-along toggle + dock control', () => {
  const initial = useDriftStore.getState();
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useDriftStore.setState(initial, true);
  });
  afterEach(cleanup);

  it('togglePlayAlong flips state and persists', () => {
    expect(useDriftStore.getState().playAlong).toBe(false);
    useDriftStore.getState().togglePlayAlong();
    expect(useDriftStore.getState().playAlong).toBe(true);
    expect(localStorage.getItem('loops.playalong')).toBe('1');
    useDriftStore.getState().togglePlayAlong();
    expect(useDriftStore.getState().playAlong).toBe(false);
    expect(localStorage.getItem('loops.playalong')).toBe('0');
  });

  it('renders the control in mandala mode and toggles on click', () => {
    useDriftStore.setState({ vizMode: 'mandala', vizUiVisible: true });
    render(<Dock />);
    const btn = screen.getByRole('button', { name: /play along/i });
    expect(useDriftStore.getState().playAlong).toBe(false);
    fireEvent.click(btn);
    expect(useDriftStore.getState().playAlong).toBe(true);
  });
});

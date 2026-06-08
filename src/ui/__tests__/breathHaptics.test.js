import { describe, it, expect } from 'vitest';
import { breathPhaseIndexAt, vibrationPattern } from '../breathHaptics.js';
import { getBreathPattern } from '../constants.js';

describe('breathPhaseIndexAt', () => {
  const box = getBreathPattern('box'); // 4-4-4-4 -> seq [in, hold, out, hold], total 16

  it('maps time within the cycle to the right phase index', () => {
    expect(breathPhaseIndexAt(box, 0)).toBe(0);   // breathe in
    expect(breathPhaseIndexAt(box, 5)).toBe(1);   // hold
    expect(breathPhaseIndexAt(box, 9)).toBe(2);   // breathe out
    expect(breathPhaseIndexAt(box, 13)).toBe(3);  // hold
  });

  it('wraps over the total period', () => {
    expect(breathPhaseIndexAt(box, 16)).toBe(0);
    expect(breathPhaseIndexAt(box, 21)).toBe(1);
  });

  it('handles negative time and degenerate patterns', () => {
    expect(breathPhaseIndexAt(box, -3)).toBe(3); // 13s into the cycle
    expect(breathPhaseIndexAt(null, 5)).toBe(0);
    expect(breathPhaseIndexAt({ seq: [], total: 0 }, 5)).toBe(0);
  });

  it('the Coherent pattern has just in/out (no holds)', () => {
    const calm = getBreathPattern('calm', 6); // 5s in, 5s out, total 10
    expect(breathPhaseIndexAt(calm, 1)).toBe(0);
    expect(breathPhaseIndexAt(calm, 6)).toBe(1);
  });
});

describe('vibrationPattern', () => {
  it('in-breath is the strongest cue and grows with strength', () => {
    expect(vibrationPattern('Breathe in', 0)).toBe(30);
    expect(vibrationPattern('Breathe in', 0.5)).toBe(75);
    expect(Array.isArray(vibrationPattern('Breathe in', 1))).toBe(true); // double-pulse at high strength
  });

  it('out-breath is a single softer pulse', () => {
    expect(vibrationPattern('Breathe out', 0)).toBe(20);
    expect(vibrationPattern('Breathe out', 1)).toBe(80);
  });

  it('holds are a faint tick', () => {
    expect(vibrationPattern('Hold', 0)).toBe(8);
    expect(vibrationPattern('Hold', 1)).toBe(24);
  });

  it('clamps out-of-range strength', () => {
    expect(vibrationPattern('Breathe out', -5)).toBe(20);
    expect(vibrationPattern('Breathe out', 9)).toBe(80);
  });
});

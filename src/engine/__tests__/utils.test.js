import { describe, it, expect } from 'vitest';
import { clamp, midiToFreq, noteName, mulberry32, hashMood } from '../utils.js';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps to lower bound', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps to upper bound', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it('handles boundary values exactly', () => {
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });
});

describe('midiToFreq', () => {
  it('returns 440 Hz for A4 (midi 69) at standard tuning', () => {
    expect(midiToFreq(69, 440)).toBeCloseTo(440);
  });
  it('returns 432 Hz for A4 at 432 tuning', () => {
    expect(midiToFreq(69, 432)).toBeCloseTo(432);
  });
  it('returns 220 Hz for A3 (one octave below A4)', () => {
    expect(midiToFreq(57, 440)).toBeCloseTo(220);
  });
  it('returns 880 Hz for A5 (one octave above A4)', () => {
    expect(midiToFreq(81, 440)).toBeCloseTo(880);
  });
  it('defaults to 440 when a4 is omitted', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
  });
});

describe('noteName', () => {
  it('returns C4 for midi 60', () => {
    expect(noteName(60)).toBe('C4');
  });
  it('returns A4 for midi 69', () => {
    expect(noteName(69)).toBe('A4');
  });
  it('returns C5 for midi 72', () => {
    expect(noteName(72)).toBe('C5');
  });
  it('handles sharps correctly', () => {
    expect(noteName(61)).toBe('C♯4');
    expect(noteName(66)).toBe('F♯4');
  });
  it('handles low octave (midi 0 = C-1)', () => {
    expect(noteName(0)).toBe('C-1');
  });
});

describe('mulberry32', () => {
  it('returns a function', () => {
    expect(typeof mulberry32(42)).toBe('function');
  });
  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('is deterministic — same seed produces same sequence', () => {
    const a = mulberry32(999);
    const b = mulberry32(999);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });
  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('hashMood', () => {
  it('returns a non-negative integer', () => {
    const h = hashMood('reflection');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
  it('is deterministic', () => {
    expect(hashMood('drift')).toBe(hashMood('drift'));
  });
  it('different strings produce different hashes', () => {
    expect(hashMood('reflection')).not.toBe(hashMood('vast'));
  });
  it('handles empty string', () => {
    expect(typeof hashMood('')).toBe('number');
  });
});

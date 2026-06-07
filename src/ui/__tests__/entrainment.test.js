import { describe, it, expect } from 'vitest';
import {
  getBreathPattern, entrainLum, ENTRAIN_MAX_HZ, ENTRAIN_DEPTH,
  BREATH_PATTERNS, BREATH_RATE_DEFAULT,
} from '../constants.js';

describe('getBreathPattern', () => {
  it('Coherent is rate-driven: 6/min -> 5s in / 5s out, 10s total', () => {
    const p = getBreathPattern('calm', 6);
    expect(p.total).toBeCloseTo(10, 5);
    expect(p.seq).toHaveLength(2);          // in, out (no holds)
    expect(p.seq[0].d).toBeCloseTo(5, 5);   // inhale
    expect(p.seq[1].d).toBeCloseTo(5, 5);   // exhale
    expect(p.seq[0].s0).toBe(0); expect(p.seq[0].s1).toBe(1);
  });

  it('slower rate -> longer period (4.5/min -> ~13.33s)', () => {
    const p = getBreathPattern('calm', 4.5);
    expect(p.total).toBeCloseTo(60 / 4.5, 4);
  });

  it('clamps out-of-range to the supported window; missing falls back to default', () => {
    expect(getBreathPattern('calm', 99).total).toBeCloseTo(60 / 7, 4);    // max 7/min
    expect(getBreathPattern('calm', 1).total).toBeCloseTo(60 / 4.5, 4);   // min 4.5/min
    expect(getBreathPattern('calm', 0).total).toBeCloseTo(60 / BREATH_RATE_DEFAULT, 4);   // 0 -> default
    expect(getBreathPattern('calm').total).toBeCloseTo(60 / BREATH_RATE_DEFAULT, 4);      // missing -> default
  });

  it('Box and 4-7-8 keep their intrinsic timing (rate ignored)', () => {
    expect(getBreathPattern('box', 4.5)).toBe(BREATH_PATTERNS.box);
    expect(getBreathPattern('478', 7)).toBe(BREATH_PATTERNS['478']);
  });
});

describe('entrainLum (photosensitivity gate)', () => {
  it('is silent when disabled or no band', () => {
    expect(entrainLum(false, 10, 0.25)).toBe(0);
    expect(entrainLum(true, 0, 0.25)).toBe(0);
  });

  it('is suppressed at/above the fast-band cutoff (beta/gamma)', () => {
    expect(entrainLum(true, ENTRAIN_MAX_HZ, 0.25)).toBe(0); // boundary excluded
    expect(entrainLum(true, 18, 0.25)).toBe(0);             // beta
    expect(entrainLum(true, 40, 0.25)).toBe(0);             // gamma
  });

  it('pulses shallowly for slow bands, bounded by the depth cap', () => {
    let max = 0;
    for (let t = 0; t < 1; t += 0.001) max = Math.max(max, Math.abs(entrainLum(true, 10, t)));
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(ENTRAIN_DEPTH + 1e-9);
  });
});

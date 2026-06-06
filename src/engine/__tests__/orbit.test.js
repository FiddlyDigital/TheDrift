import { describe, it, expect } from 'vitest';
import { assignOrbits, orbitPosition } from '../orbit.js';

describe('assignOrbits', () => {
  it('is deterministic for fixed periods/rows', () => {
    const mk = () => [
      { period: 8, row: 0 }, { period: 20, row: 1 }, { period: 48, row: 2 },
    ];
    const a = assignOrbits(mk());
    const b = assignOrbits(mk());
    expect(a.map((v) => v.orbit)).toEqual(b.map((v) => v.orbit));
  });
  it('maps shortest loop to the inner radius and longest to the outer', () => {
    const vs = assignOrbits([
      { period: 8, row: 0 }, { period: 20, row: 1 }, { period: 48, row: 2 },
    ]);
    expect(vs[0].orbit.radius).toBeCloseTo(0.55, 5);       // shortest -> inner
    expect(vs[2].orbit.radius).toBeCloseTo(0.55 + 1.35, 5); // longest -> outer
    expect(vs[1].orbit.radius).toBeGreaterThan(vs[0].orbit.radius);
    expect(vs[1].orbit.radius).toBeLessThan(vs[2].orbit.radius);
  });
});

describe('orbitPosition', () => {
  it('traces a circle of the orbit radius in a flat (untilted) plane', () => {
    const orbit = { radius: 1.2, tilt: 0, azimuth: 0 };
    const p0 = orbitPosition(orbit, 0);
    expect(p0[0]).toBeCloseTo(1.2, 5);   // theta=0 -> +x
    expect(p0[1]).toBeCloseTo(0, 5);     // flat -> y is 0
    expect(p0[2]).toBeCloseTo(0, 5);
    const pHalf = orbitPosition(orbit, Math.PI);
    expect(pHalf[0]).toBeCloseTo(-1.2, 5); // theta=pi -> -x
  });
  it('keeps every point on the sphere of the orbit radius regardless of tilt/azimuth', () => {
    const orbit = { radius: 0.9, tilt: 0.6, azimuth: 2.1 };
    for (let k = 0; k < 8; k++) {
      const p = orbitPosition(orbit, (k / 8) * Math.PI * 2);
      const r = Math.hypot(p[0], p[1], p[2]);
      expect(r).toBeCloseTo(0.9, 5);
    }
  });
});

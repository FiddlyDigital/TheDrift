import { describe, it, expect } from 'vitest';
import { parseScaleNotes, parseVoices } from '../AmbientEngine.js';
import { SCALES } from '../constants.js';

describe('parseScaleNotes', () => {
  it('parses a dotted degree string', () => {
    expect(parseScaleNotes('0.2.4.5.7.9.11')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
  it('sorts and de-duplicates, drops out-of-range', () => {
    expect(parseScaleNotes('7.0.7.4.13.-1.2')).toEqual([0, 2, 4, 7]);
  });
  it('returns [] for empty/garbage', () => {
    expect(parseScaleNotes('')).toEqual([]);
    expect(parseScaleNotes(null)).toEqual([]);
    expect(parseScaleNotes('xyz')).toEqual([]);
  });
  it('round-trips every named scale', () => {
    for (const id in SCALES) {
      expect(parseScaleNotes(SCALES[id].join('.'))).toEqual(SCALES[id]);
    }
  });
});

describe('parseVoices', () => {
  it('parses pinned and roaming fields', () => {
    const specs = parseVoices('piano:60:12.0:1,*:_:_:0');
    expect(specs).toEqual([
      { inst: 'piano', note: 60, len: 12.0, lock: true },
      { inst: null, note: null, len: null, lock: false },
    ]);
  });
  it('returns [] for empty', () => {
    expect(parseVoices('')).toEqual([]);
    expect(parseVoices(null)).toEqual([]);
  });
  it('treats * and _ as generative (null)', () => {
    const s = parseVoices('*:_:_:0')[0];
    expect(s.inst).toBeNull();
    expect(s.note).toBeNull();
    expect(s.len).toBeNull();
  });
  it('round-trips an encode->decode of a mixed loom', () => {
    const arr = [
      { inst: 'bell', note: 72, len: 8.5, lock: true },
      { inst: null, note: 60, len: null, lock: false },
      { inst: 'harp', note: null, len: 20.0, lock: false },
    ];
    const enc = arr.map((s) =>
      (s.inst || '*') + ':' + (s.note == null ? '_' : s.note) + ':' + (s.len == null ? '_' : (+s.len).toFixed(1)) + ':' + (s.lock ? '1' : '0')
    ).join(',');
    expect(parseVoices(enc)).toEqual(arr);
  });
});

describe('custom scale pool', () => {
  // mirrors the engine's pool builder for a known key + scale
  function pool(rootPc, notes, register) {
    const base = Math.round(41 + register * 19);
    const out = [];
    for (let oct = 0; oct < 3; oct++) for (const d of notes) {
      const m = base + rootPc + d + 12 * oct;
      if (m <= base + 30) out.push(m);
    }
    out.sort((a, b) => a - b);
    return out;
  }
  it('builds D dorian from key + scale at register 0.5', () => {
    const base = Math.round(41 + 0.5 * 19); // 50 (D3)
    const p = pool(2, SCALES.dorian, 0.5);
    expect(p[0]).toBe(base + 2);           // D
    expect(p.every((m) => m <= base + 30)).toBe(true);
    // all pitch classes are within D dorian
    const pcs = new Set(p.map((m) => ((m - (base + 2)) % 12 + 12) % 12));
    for (const pc of pcs) expect(SCALES.dorian.indexOf(pc)).toBeGreaterThanOrEqual(0);
  });
});

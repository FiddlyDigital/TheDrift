import { describe, it, expect } from 'vitest';
import {
  tempoLabel, stutterLabel, bloomLabel, driftLabel,
  registerLabel, spaceLabel, colorLabel, evolveLabel,
  journeyLabel, glueLabel, binlevelLabel, pctLabel,
} from '../labels.js';

const LABEL_CASES = [
  { fn: tempoLabel,     cases: [[0, 'glacial'], [0.1, 'glacial'], [0.2, 'slow'], [0.5, 'flowing'], [0.9, 'brisk'], [1, 'brisk']] },
  { fn: stutterLabel,   cases: [[0, 'none'], [0.1, 'rare'], [0.3, 'occasional'], [0.6, 'frequent'], [0.9, 'restless']] },
  { fn: bloomLabel,     cases: [[0, 'pure'], [0.1, 'glassy'], [0.4, 'shimmering'], [0.7, 'ringing'], [0.9, 'colliding']] },
  { fn: driftLabel,     cases: [[0, 'nearly even'], [0.3, 'loosening'], [0.5, 'unequal'], [0.7, 'wide'], [1, 'scattered']] },
  { fn: registerLabel,  cases: [[0, 'deep'], [0.25, 'low'], [0.5, 'middle'], [0.7, 'high'], [1, 'glassy']] },
  { fn: spaceLabel,     cases: [[0, 'close'], [0.3, 'room'], [0.5, 'hall'], [0.7, 'cathedral'], [1, 'endless']] },
  { fn: colorLabel,     cases: [[0, 'felt, muted'], [0.3, 'soft'], [0.55, 'warm'], [0.75, 'open'], [1, 'bright']] },
  { fn: evolveLabel,    cases: [[0, 'fixed'], [0.1, 'slow drift'], [0.4, 'wandering'], [0.7, 'shifting'], [1, 'restless']] },
  { fn: journeyLabel,   cases: [[0, 'off'], [0.1, 'unfolding'], [0.5, 'drifting'], [0.7, 'roaming'], [1, 'restless']] },
  { fn: glueLabel,      cases: [[0, 'transparent'], [0.1, 'gentle'], [0.4, 'firm'], [0.7, 'pressed'], [1, 'pumping']] },
  { fn: binlevelLabel,  cases: [[0, 'faint'], [0.3, 'soft'], [0.5, 'present'], [1, 'strong']] },
];

for (const { fn, cases } of LABEL_CASES) {
  describe(fn.name, () => {
    for (const [input, expected] of cases) {
      it(`${input} → "${expected}"`, () => {
        expect(fn(input)).toBe(expected);
      });
    }
    it('returns a string for any value in [0, 1]', () => {
      for (let v = 0; v <= 1; v += 0.1) {
        expect(typeof fn(v)).toBe('string');
      }
    });
  });
}

describe('pctLabel', () => {
  it('formats 0 as "0%"', () => expect(pctLabel(0)).toBe('0%'));
  it('formats 0.5 as "50%"', () => expect(pctLabel(0.5)).toBe('50%'));
  it('formats 1 as "100%"', () => expect(pctLabel(1)).toBe('100%'));
  it('rounds to nearest integer', () => expect(pctLabel(0.556)).toBe('56%'));
});

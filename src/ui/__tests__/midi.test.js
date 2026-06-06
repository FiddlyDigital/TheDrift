import { describe, it, expect } from 'vitest';
import { parseMidi } from '../midi.js';

describe('parseMidi', () => {
  it('parses a Control Change on any channel', () => {
    expect(parseMidi([0xb0, 74, 100])).toEqual({ type: 'cc', number: 74, value: 100, channel: 0 });
    expect(parseMidi([0xb5, 1, 0])).toEqual({ type: 'cc', number: 1, value: 0, channel: 5 });
  });
  it('parses a Note On with velocity > 0', () => {
    expect(parseMidi([0x90, 60, 64])).toEqual({ type: 'note', number: 60, value: 64, channel: 0 });
    expect(parseMidi([0x93, 36, 127])).toEqual({ type: 'note', number: 36, value: 127, channel: 3 });
  });
  it('treats Note On with velocity 0 as null (note-off convention)', () => {
    expect(parseMidi([0x90, 60, 0])).toBeNull();
  });
  it('ignores other message types and short/empty data', () => {
    expect(parseMidi([0x80, 60, 64])).toBeNull(); // note-off
    expect(parseMidi([0xe0, 0, 64])).toBeNull();  // pitch bend
    expect(parseMidi([0xf8])).toBeNull();         // clock
    expect(parseMidi([])).toBeNull();
    expect(parseMidi(null)).toBeNull();
  });
});

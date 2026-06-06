import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';
import { GlyphSVG, FAMILY_LABEL } from '../glyphs.jsx';

// Instrument-family legend, shown only when more than one family is sounding.
export function Legend() {
  const families = useDriftStore((s) => s.families);
  if (families.length <= 1) return null;
  return (
    <div className="legend">
      {families.map((f) => (
        <span key={f} className="legend-item"><GlyphSVG family={f} /> {FAMILY_LABEL[f] || f}</span>
      ))}
    </div>
  );
}

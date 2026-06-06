import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { CloseIcon } from '../../icons.jsx';
import { SessionSheet } from './SessionSheet.jsx';
import { JourneySheet } from './JourneySheet.jsx';
import { InfoSheet } from './InfoSheet.jsx';
import { ExportSheet } from './ExportSheet.jsx';

const SHEETS = {
  session: SessionSheet,
  journey: JourneySheet,
  info: InfoSheet,
  export: ExportSheet,
};

// Modal bottom-sheet host (immersive view). Tapping the scrim or close button
// dismisses; the active sheet is chosen by store state.
export function Sheets() {
  const immersive = useDriftStore((s) => s.immersive);
  const sheet = useDriftStore((s) => s.sheet);
  const setSheet = useDriftStore((s) => s.setSheet);
  if (!immersive || !sheet) return null;
  const Body = SHEETS[sheet];

  return (
    <div className="sheet-scrim" onClick={() => setSheet(null)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-x" onClick={() => setSheet(null)} aria-label="Close"><CloseIcon /></button>
        {Body && <Body />}
      </div>
    </div>
  );
}

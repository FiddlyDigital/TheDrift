import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { BellIcon } from '../../icons.jsx';
import { fmt } from '../../format.js';

// The floating session / journey / drift status readout in the immersive view.
export function StatusIndicators() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const sessionRemain = useDriftStore((s) => s.sessionRemain);
  const journey = useDriftStore((s) => s.journey);
  const journeyRemain = useDriftStore((s) => s.journeyRemain);
  const driftOn = useDriftStore((s) => s.driftOn);
  const driftNow = useDriftStore((s) => s.driftNow);

  if (sessionEnd > 0) {
    return (
      <div className="session-immersive">
        <span className="session-immersive-ico" aria-hidden="true"><BellIcon /></span>
        {fmt(sessionRemain)}
      </div>
    );
  }
  if (journey) {
    return (
      <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
        <span className="journey-immersive-name">{journey.name}</span>
        <span className="session-meta-sep">&middot;</span>
        {fmt(journeyRemain)}
      </div>
    );
  }
  if (driftOn) {
    return (
      <div className={"session-immersive" + (vizUiVisible ? " show" : "")}>
        <span className="journey-immersive-name">Endless Drift</span>
        <span className="session-meta-sep">&middot;</span>
        {driftNow}
      </div>
    );
  }
  return null;
}

import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { JOURNEYS, DRIFT_POOL } from '../../constants.js';
import { fmt } from '../../format.js';

// Journey sheet: a live journey's progress, the live endless-drift state, or the
// chooser (endless drift + curated journeys).
export function JourneySheet() {
  const journey = useDriftStore((s) => s.journey);
  const journeyRemain = useDriftStore((s) => s.journeyRemain);
  const journeyStop = useDriftStore((s) => s.journeyStop);
  const driftOn = useDriftStore((s) => s.driftOn);
  const driftNow = useDriftStore((s) => s.driftNow);
  const driftNext = useDriftStore((s) => s.driftNext);
  const driftProgress = useDriftStore((s) => s.driftProgress);
  const beginJourney = useDriftStore((s) => s.beginJourney);
  const cancelJourney = useDriftStore((s) => s.cancelJourney);
  const beginDrift = useDriftStore((s) => s.beginDrift);
  const cancelDrift = useDriftStore((s) => s.cancelDrift);
  const setSheet = useDriftStore((s) => s.setSheet);

  if (journey) {
    return (
      <div className="sheet-body">
        <div className="journey-live">
          <h2 className="sheet-title">{journey.name}</h2>
          <div className="journey-live-top">
            <span className="journey-live-time">{fmt(journeyRemain)} left</span>
          </div>
          <div className="journey-track">
            <div className="journey-track-fill" style={{ width: ((1 - journeyRemain / (journey.total * 60)) * 100) + "%" }}></div>
            {journey.stops.map((nm, i) => {
              const n = journey.stops.length;
              return <span key={i} className={"journey-node" + (i <= journeyStop ? " reached" : "")} style={{ left: (i / (n - 1)) * 100 + "%" }} title={nm}></span>;
            })}
          </div>
          <div className="journey-path">
            {journey.stops.map((nm, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="journey-arrow">&rarr;</span>}
                <span className={"journey-stopname" + (i === journeyStop ? " now" : "") + (i < journeyStop ? " past" : "")}>{nm}</span>
              </React.Fragment>
            ))}
          </div>
          <button className="session-begin end" onClick={() => { cancelJourney(); setSheet(null); }}>End journey</button>
        </div>
      </div>
    );
  }

  if (driftOn) {
    return (
      <div className="sheet-body">
        <div className="journey-live">
          <h2 className="sheet-title">Endless Drift</h2>
          <p className="sheet-lede">Wandering gently between kindred scenes. It never ends &mdash; stop it whenever you like.</p>
          <div className="drift-now">
            <span className="drift-now-name">{driftNow}</span>
            <span className="journey-arrow drift-to">&rarr;</span>
            <span className="drift-next-name">{driftNext}</span>
          </div>
          <div className="journey-track">
            <div className="journey-track-fill" style={{ width: (driftProgress * 100) + "%" }}></div>
          </div>
          <div className="drift-cap">drifting toward <em>{driftNext}</em></div>
          <button className="session-begin end" onClick={() => { cancelDrift(); setSheet(null); }}>End drift</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-body">
      <h2 className="sheet-title">Journeys</h2>
      <p className="sheet-lede">Timed arcs that travel between scenes &mdash; the mandala leads, you follow.</p>
      <button className="journey-card drift-card" onClick={() => { beginDrift(); setSheet(null); }}>
        <div className="journey-card-top">
          <span className="journey-card-name">Endless Drift</span>
          <span className="journey-card-dur">&infin;</span>
        </div>
        <p className="journey-card-blurb">A never-ending wander between kindred calm scenes &mdash; set it and let it run.</p>
        <div className="journey-card-path">
          {DRIFT_POOL.slice(0, 4).map((nm, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="journey-arrow">&middot;</span>}
              <span>{nm}</span>
            </React.Fragment>
          ))}
          <span className="journey-arrow">&hellip;</span>
        </div>
      </button>
      <div className="journey-cards">
        {JOURNEYS.map((j) => (
          <button key={j.id} className="journey-card" onClick={() => { beginJourney(j); setSheet(null); }}>
            <div className="journey-card-top">
              <span className="journey-card-name">{j.name}</span>
              <span className="journey-card-dur">{j.total} min</span>
            </div>
            <p className="journey-card-blurb">{j.blurb}</p>
            <div className="journey-card-path">
              {j.stops.map((nm, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="journey-arrow">&rarr;</span>}
                  <span>{nm}</span>
                </React.Fragment>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

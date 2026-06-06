import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SESSION_OPTS, INTERVAL_OPTS, SLEEP_OPTS, WAKE_OPTS } from '../../constants.js';
import { BellIcon, SunriseIcon } from '../../icons.jsx';
import { fmt, fmtUntil } from '../../format.js';

// Session sheet: set up a timed sit (with optional interval bell), or a sleep
// fade / sunrise wake. When a session is live it shows a clock + progress.
export function SessionSheet() {
  const sessionEnd = useDriftStore((s) => s.sessionEnd);
  const sessionPick = useDriftStore((s) => s.sessionPick);
  const sessionInterval = useDriftStore((s) => s.sessionInterval);
  const sessionRemain = useDriftStore((s) => s.sessionRemain);
  const sessionTotal = useDriftStore((s) => s._sessionTotal);
  const sleepDur = useDriftStore((s) => s.sleepDur);
  const wakeIn = useDriftStore((s) => s.wakeIn);
  const wakeAt = useDriftStore((s) => s.wakeAt);
  const wakeRising = useDriftStore((s) => s.wakeRising);
  const setSessionPick = useDriftStore((s) => s.setSessionPick);
  const setSessionInterval = useDriftStore((s) => s.setSessionInterval);
  const beginSession = useDriftStore((s) => s.beginSession);
  const endSession = useDriftStore((s) => s.endSession);
  const setSleep = useDriftStore((s) => s.setSleep);
  const setWake = useDriftStore((s) => s.setWake);
  const setSheet = useDriftStore((s) => s.setSheet);

  if (sessionEnd) {
    return (
      <div className="sheet-body">
        <div className="session-live">
          <h2 className="sheet-title">Session</h2>
          <div className="session-clock">{fmt(sessionRemain)}</div>
          <div className="session-bar"><div className="session-bar-fill"
            style={{ width: (sessionTotal ? Math.min(100, (1 - sessionRemain / sessionTotal) * 100) : 0) + "%" }}></div></div>
          <div className="session-meta">
            {sessionInterval > 0 ? <span><BellIcon /> bell every {sessionInterval} min</span> : <span>silence between the bells</span>}
          </div>
          <button className="session-begin end" onClick={() => { endSession(); setSheet(null); }}>End session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-body">
      <h2 className="sheet-title">Session</h2>
      <p className="sheet-lede">A timed sit, opened and closed by a singing bowl.</p>
      <div className="sheet-group">
        <span className="sheet-label">Length</span>
        <div className="session-chips">
          {SESSION_OPTS.map((m) => (
            <button key={m} className={"chip lg" + (sessionPick === m ? " active" : "")}
              onClick={() => setSessionPick(m)}>{m} min</button>
          ))}
        </div>
      </div>
      <div className="sheet-group">
        <span className="sheet-label">Interval bell</span>
        <div className="session-chips">
          {INTERVAL_OPTS.map((m) => (
            <button key={m} className={"chip lg" + (sessionInterval === m ? " active" : "")}
              onClick={() => setSessionInterval(m)}>{m === 0 ? "None" : "every " + m + "m"}</button>
          ))}
        </div>
      </div>
      <button className="session-begin" onClick={() => { beginSession(sessionPick); setSheet(null); }}>
        <BellIcon /> Begin {sessionPick}-minute session
      </button>
      <div className="sheet-group sheet-aside">
        <span className="sheet-label">Or drift off &mdash; fade to sleep</span>
        <div className="session-chips">
          {SLEEP_OPTS.map((m) => (
            <button key={m} className={"chip lg" + (sleepDur === m ? " active" : "")}
              onClick={() => { setSleep(sleepDur === m ? 0 : m); setSheet(null); }}>{m} min</button>
          ))}
        </div>
      </div>
      <div className="sheet-group">
        <span className="sheet-label">Or wake gently &mdash; sunrise rise</span>
        <div className="session-chips">
          {WAKE_OPTS.map((m) => (
            <button key={m} className={"chip lg" + (wakeIn === m ? " active" : "")}
              onClick={() => { setWake(wakeIn === m ? 0 : m); setSheet(null); }}>
              {m < 60 ? m + " min" : (m / 60) + "h"}
            </button>
          ))}
        </div>
        {wakeAt > 0 && !wakeRising && (
          <div className="wake-status">
            <SunriseIcon /> Rising in <em>{fmtUntil((wakeAt - Date.now()) / 1000)}</em>
            <button className="export-again" onClick={() => setWake(0)}>Cancel</button>
          </div>
        )}
        {wakeRising && (
          <div className="wake-status rising">
            <SunriseIcon /> Sunrise &mdash; rising now
          </div>
        )}
      </div>
    </div>
  );
}

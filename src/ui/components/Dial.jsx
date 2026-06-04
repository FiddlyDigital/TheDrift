import React, { useState, useEffect, useRef } from 'react';
import { Slider } from './Slider.jsx';
import { DIAL_HINTS } from '../labels.js';

export function Dial({ name, value, label, min, max, step, onChange }) {
  const [showHint, setShowHint] = useState(false);
  const hint = DIAL_HINTS[name];
  const wrapRef = useRef(null);
  // dismiss on outside click — keeps the tooltip from sticking around
  useEffect(() => {
    if (!showHint) return;
    const close = (e) => { if (!wrapRef.current || !wrapRef.current.contains(e.target)) setShowHint(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showHint]);
  return (
    <div className={"dial" + (showHint ? " hinted" : "")}>
      <div className="dial-head">
        <span className="dial-name">
          {name}
          {hint && (
            <span className="dial-info-wrap" ref={wrapRef}>
              <button className="dial-info" onClick={(e) => { e.stopPropagation(); setShowHint((v) => !v); }}
                aria-label={showHint ? "Hide hint" : "What is " + name + "?"}
                aria-expanded={showHint}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
                </svg>
              </button>
              {showHint && (
                <span className="dial-tooltip" role="tooltip">
                  {hint}
                  <span className="dial-tooltip-arrow" aria-hidden="true"></span>
                </span>
              )}
            </span>
          )}
        </span>
        <span className="dial-val">{label}</span>
      </div>
      <Slider name={name} valuetext={String(label)}
        min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}

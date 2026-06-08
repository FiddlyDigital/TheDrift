import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// One-time, photosensitivity-aware consent shown the first time someone turns on
// entrain light. Nothing flickers until they accept.
export function EntrainConsent() {
  const open = useDriftStore((s) => s.entrainPrompt);
  const confirm = useDriftStore((s) => s.confirmEntrain);
  const dismiss = useDriftStore((s) => s.dismissEntrainPrompt);
  if (!open) return null;

  return (
    <div className="sheet-scrim" onClick={dismiss}>
      <div className="sheet sheet-narrow" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Entrain light">
        <div className="info-eyebrow">Before you enable</div>
        <h2 className="info-title">Entrain light<em>.</em></h2>
        <p className="info-sub">
          This gently pulses the screen brightness in time with the beat to
          encourage entrainment. It is slow and subtle, and fast bands are
          disabled &mdash; but if you are sensitive to flickering light, or have
          photosensitive epilepsy, please leave it off.
        </p>
        <div className="info-actions">
          <button className="ghost-btn accent" onClick={confirm}>Enable entrain light</button>
          <button className="ghost-btn" onClick={dismiss}>Not now</button>
        </div>
        <div className="info-foot">honors your system "reduce motion" setting</div>
      </div>
    </div>
  );
}

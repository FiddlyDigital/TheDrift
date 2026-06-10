import React from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// One-time, photosensitivity-aware consent shown the first time someone enables
// the Ganzfeld deep-phase flicker. Nothing flickers until they accept, and even
// then only in the final phase, bounded, and never under reduce-motion.
export function GanzfeldConsent() {
  const open = useDriftStore((s) => s.ganzfeldStrobePrompt);
  const confirm = useDriftStore((s) => s.confirmGanzfeldStrobe);
  const dismiss = useDriftStore((s) => s.dismissGanzfeldStrobe);
  if (!open) return null;

  return (
    <div className="sheet-scrim" onClick={dismiss}>
      <div className="sheet sheet-narrow" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Moderated flicker">
        <div className="info-eyebrow">Before you enable</div>
        <h2 className="info-title">Moderated flicker<em>.</em></h2>
        <p className="info-sub">
          In the Ganzfeld deep phase this gently oscillates the field's brightness
          at a slow, steady rate to deepen the effect. It is bounded &mdash; never
          a hard flash &mdash; and stops entirely under your system's reduce-motion
          setting. Still, if you are sensitive to flickering light, or have
          photosensitive epilepsy, please leave it off.
        </p>
        <div className="info-actions">
          <button className="ghost-btn accent" onClick={confirm}>Enable moderated flicker</button>
          <button className="ghost-btn" onClick={dismiss}>Not now</button>
        </div>
        <div className="info-foot">honors your system "reduce motion" setting</div>
      </div>
    </div>
  );
}

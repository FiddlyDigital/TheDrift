import React from 'react';

// Quick orientation + keyboard shortcuts. Opened with "?" or from the About sheet.
const KEYS = [
  ['Space', 'Play / pause'],
  ['S', 'Sound & tuning panel'],
  ['B', 'Breath guide'],
  ['2 / 3', 'Mandala / 3D space'],
  ['F', 'Fullscreen'],
  ['T', 'Session timer'],
  ['J', 'Journey'],
  ['?', 'This help'],
  ['Esc', 'Close panel or sheet'],
];

export function HelpSheet() {
  return (
    <div className="sheet-body">
      <div className="info-eyebrow">Getting around</div>
      <h2 className="info-title">Keys &amp; gestures<em>.</em></h2>
      <p className="info-sub">
        The mandala is home. The dock along the bottom is your remote — open
        <b> Sound</b> to shape the music, <b>Breathe</b> to pace a session, and
        set a <b>timer</b> or a <b>journey</b> from there too.
      </p>
      <dl className="shortcuts">
        {KEYS.map(([k, label]) => (
          <div className="shortcut-row" key={k}>
            <dt><kbd>{k}</kbd></dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      <div className="info-foot">
        tip &middot; tap the mandala to reveal the controls; they fade again after a few seconds of stillness
      </div>
    </div>
  );
}

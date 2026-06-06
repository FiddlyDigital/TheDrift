import React from 'react';

// One MIDI-mappable control's binding row. Presentational — learn/clear come in
// as callbacks.
export function MidiRow({ control, binding, learning, onLearn, onClear }) {
  return (
    <div className={"midi-row" + (learning ? " learning" : "")}>
      <span className="midi-label">{control.label}</span>
      <span className="midi-binding">{binding ? (binding.type === "cc" ? "CC " + binding.number : "Note " + binding.number) : "—"}</span>
      <button className={"chip mini" + (learning ? " active" : "")} onClick={onLearn}>
        {learning ? "move a control…" : "Learn"}
      </button>
      {binding && <button className="chip mini ghost" onClick={onClear} title="clear binding">&times;</button>}
    </div>
  );
}

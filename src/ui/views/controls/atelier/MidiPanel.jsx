import React from 'react';
import { useDriftStore } from '../../../store/useDriftStore.js';
import { MIDI_CONTROLS } from '../../../store/midiSlice.js';
import { MidiRow } from './MidiRow.jsx';

// Web MIDI mapping: enable access, then learn/clear a binding per control.
export function MidiPanel() {
  const midiSupported = useDriftStore((s) => s.midiSupported);
  const midiEnabled = useDriftStore((s) => s.midiEnabled);
  const midiInputs = useDriftStore((s) => s.midiInputs);
  const midiLearn = useDriftStore((s) => s.midiLearn);
  const midiMap = useDriftStore((s) => s.midiMap);
  const enableMidi = useDriftStore((s) => s.enableMidi);
  const setMidiLearn = useDriftStore((s) => s.setMidiLearn);
  const clearMidiBinding = useDriftStore((s) => s.clearMidiBinding);

  return (
    <div className="atelier-group">
      <div className="loom-head">
        <span className="row-label">MIDI</span>
        <div className="loom-actions">
          {!midiSupported ? (
            <span className="atelier-hint">Not supported in this browser</span>
          ) : !midiEnabled ? (
            <button className="chip" onClick={enableMidi}>Enable MIDI</button>
          ) : (
            <span className="midi-devices">{midiInputs.length ? midiInputs.map((i) => i.name).join(", ") : "no devices connected"}</span>
          )}
        </div>
      </div>
      {midiEnabled && (
        <>
          <div className="midi-map">
            {MIDI_CONTROLS.map((c, i) => {
              const learning = midiLearn === c.id;
              const newGroup = i === 0 || MIDI_CONTROLS[i - 1].group !== c.group;
              return (
                <React.Fragment key={c.id}>
                  {newGroup && <div className="midi-group">{c.group}</div>}
                  <MidiRow control={c} binding={midiMap[c.id]} learning={learning}
                    onLearn={() => setMidiLearn(learning ? null : c.id)}
                    onClear={() => clearMidiBinding(c.id)} />
                </React.Fragment>
              );
            })}
          </div>
          <p className="atelier-hint">Click <b>Learn</b>, then move a knob/fader or press a key on your controller to bind it. Knobs map to the ranges; buttons/keys map to transport (Play, Start, Stop) and scene changes.</p>
        </>
      )}
    </div>
  );
}

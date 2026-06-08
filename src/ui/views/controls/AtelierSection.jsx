import React from 'react';
import { ScaleEditor } from './atelier/ScaleEditor.jsx';
import { VoiceLoom } from './atelier/VoiceLoom.jsx';
import { Scopes } from './atelier/Scopes.jsx';
import { MidiPanel } from './atelier/MidiPanel.jsx';

// Hidden expert section. A thin shell composing the three sub-panels; each reads
// what it needs from the store.
export function AtelierSection() {
  return (
    <div className="panel-body atelier" role="tabpanel" id="panel-atelier" aria-labelledby="tab-atelier">
      <p className="atelier-intro">
        Compose the ingredients by hand, then let them drift. Set a key and mode,
        choose the notes, and build each loop&rsquo;s instrument, note and length.
        Locked voices hold; the rest keep slowly roaming.
      </p>
      <ScaleEditor />
      <VoiceLoom />
      <Scopes />
      <MidiPanel />
    </div>
  );
}

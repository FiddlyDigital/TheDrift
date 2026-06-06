import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { moodName, ensembleName } from '../../format.js';

// "Now casting" caption strip shown in the immersive view.
export function CastCaption() {
  const vizUiVisible = useDriftStore((s) => s.vizUiVisible);
  const params = useDriftStore((s) => s.params);
  const activeScene = useDriftStore((s) => s.activeScene);

  return (
    <div className={"cast-caption" + (vizUiVisible ? " show" : "")}>
      <b>The Drift</b>
      <span className="dot">&middot;</span>
      <span>{ensembleName(params)}</span>
      <span className="dot">&middot;</span>
      <span>{moodName(params)}</span>
      {activeScene && (<><span className="dot">&middot;</span><span>{activeScene}</span></>)}
    </div>
  );
}

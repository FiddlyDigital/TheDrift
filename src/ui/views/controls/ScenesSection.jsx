import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { SCENES } from '../../constants.js';

// Curated scenes + the listener's saved "Yours" library (recall / rename / delete).
export function ScenesSection() {
  const activeScene = useDriftStore((s) => s.activeScene);
  const applyScene = useDriftStore((s) => s.applyScene);
  const library = useDriftStore((s) => s.library);
  const activeSaved = useDriftStore((s) => s.activeSaved);
  const renamingId = useDriftStore((s) => s.renamingId);
  const recallSaved = useDriftStore((s) => s.recallSaved);
  const renameSaved = useDriftStore((s) => s.renameSaved);
  const setRenamingId = useDriftStore((s) => s.setRenamingId);
  const deleteSaved = useDriftStore((s) => s.deleteSaved);

  return (
    <div className="panel-body" role="tabpanel" id="panel-scenes" aria-labelledby="tab-scenes">
      <div className="mood-row">
        <span className="row-label">Scene</span>
        <div className="moods">
          {SCENES.map((sc) => (
            <button key={sc.name}
              className={"mood" + (activeScene === sc.name ? " active" : "")}
              onClick={() => applyScene(sc)}>
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mood-row">
        <span className="row-label">Yours</span>
        {library.length > 0 ? (
          <div className="moods saved-row">
            {library.map((item) => (
              <div key={item.id}
                className={"saved" + (activeSaved === item.id ? " active" : "")}>
                {renamingId === item.id ? (
                  <input className="saved-input" autoFocus defaultValue={item.name}
                    onBlur={(e) => renameSaved(item.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                      else if (e.key === "Escape") setRenamingId(null);
                    }} />
                ) : (
                  <button className="saved-name" onClick={() => recallSaved(item)}
                    onDoubleClick={() => setRenamingId(item.id)}
                    title="Recall · double-click to rename">
                    {item.name}
                  </button>
                )}
                <button className="saved-x" onClick={() => deleteSaved(item.id)}
                  aria-label="Remove from library" title="Remove">&times;</button>
              </div>
            ))}
          </div>
        ) : (
          <span className="saved-empty">save a drift you love &mdash; it lands here</span>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { useDriftStore } from '../../store/useDriftStore.js';
import { EXPORT_OPTS } from '../../constants.js';
import { DownloadIcon } from '../../icons.jsx';
import { moodName, ensembleName } from '../../format.js';

// Offline WAV export sheet with a length picker and progress state.
export function ExportSheet() {
  const params = useDriftStore((s) => s.params);
  const activeScene = useDriftStore((s) => s.activeScene);
  const exportMin = useDriftStore((s) => s.exportMin);
  const exportState = useDriftStore((s) => s.exportState);
  const exportPct = useDriftStore((s) => s.exportPct);
  const setExportMin = useDriftStore((s) => s.setExportMin);
  const doExport = useDriftStore((s) => s.doExport);

  return (
    <div className="sheet-body">
      <h2 className="sheet-title">Export this drift</h2>
      <p className="sheet-lede">Render what&rsquo;s playing now to a WAV file you can keep &mdash; the loops will keep phasing for the whole length, so it never loops.</p>
      <div className="sheet-group">
        <span className="sheet-label">Length</span>
        <div className="session-chips">
          {EXPORT_OPTS.map((m) => (
            <button key={m}
              className={"chip lg" + (exportMin === m ? " active" : "")}
              disabled={exportState === "rendering"}
              onClick={() => setExportMin(m)}>{m} min</button>
          ))}
        </div>
      </div>
      {exportState === "rendering" ? (
        <div className="export-progress">
          <div className="session-bar"><div className="session-bar-fill" style={{ width: Math.round(exportPct * 100) + "%" }}></div></div>
          <div className="export-status">Rendering &amp; normalising&hellip; {Math.round(exportPct * 100)}%</div>
        </div>
      ) : (
        <button className="session-begin" onClick={() => doExport(exportMin)}>
          <DownloadIcon /> Render {exportMin}-minute WAV
        </button>
      )}
      {exportState === "done" && <div className="export-status done">Saved &mdash; check your downloads. <button className="export-again" onClick={() => doExport(exportMin)}>Render another</button></div>}
      {exportState === "error" && <div className="export-status err">Render failed &mdash; try a shorter length.</div>}
      <div className="info-foot">{ensembleName(params)} &middot; {moodName(params)}{activeScene ? " · " + activeScene : ""} &middot; 44.1kHz stereo WAV</div>
    </div>
  );
}

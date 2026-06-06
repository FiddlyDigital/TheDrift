import { ENGINE, AmbientEngine } from '../../engine/index.js';

// Offline WAV render/export. A faux progress ticker runs while the engine
// renders offline, then the normalised buffer is downloaded as a .wav.
export function createExportSlice(set, get) {
  return {
    exportMin: 2,
    exportState: "idle",   // idle | rendering | done | error
    exportPct: 0,

    setExportMin: (v) => set({ exportMin: v }),

    doExport: (minutes) => {
      if (get().exportState === "rendering") return;
      set({ exportState: "rendering", exportPct: 0 });
      let p = 0;
      const ticker = setInterval(() => {
        p = Math.min(0.92, p + 0.04 + Math.random() * 0.05);
        set({ exportPct: p });
      }, 220);
      const sceneLabel = get().activeScene || get().activeSaved || ENGINE.params.ensemble;
      setTimeout(() => {
        ENGINE.renderOffline({ seconds: minutes * 60, params: ENGINE.params })
          .then((buf) => {
            let peak = 0;
            for (let c = 0; c < buf.numberOfChannels; c++) {
              const d = buf.getChannelData(c);
              for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
            }
            if (peak > 0) {
              const g = Math.min(8, 0.89 / peak);
              for (let c = 0; c < buf.numberOfChannels; c++) {
                const d = buf.getChannelData(c);
                for (let i = 0; i < d.length; i++) d[i] *= g;
              }
            }
            const blob = AmbientEngine.bufferToWav(buf);
            const safe = String(sceneLabel || "drift").replace(/[^\w\s-]/g, "").trim() || "drift";
            const fname = "The Drift - " + safe + " (" + minutes + "m).wav";
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = fname;
            document.body.appendChild(a); a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
            clearInterval(ticker);
            set({ exportPct: 1, exportState: "done" });
          })
          .catch(() => {
            clearInterval(ticker);
            set({ exportState: "error" });
          });
      }, 60);
    },
  };
}

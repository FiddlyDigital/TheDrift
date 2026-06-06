import { ENGINE } from '../../engine/index.js';

const upd = (v, prev) => (typeof v === 'function' ? v(prev) : v);
const ls = (k, d) => { try { return localStorage.getItem(k); } catch (e) { return d; } };

// Presentation + local playback preferences: the immersive view, sheets, the
// welcome screen, breath guide, hidden Atelier unlock, spatial-audio toggle and
// the PWA install prompt. Preferences persist to localStorage on change.
export function createUiSlice(set, get, init) {
  const firstVisit = (() => {
    try { return !init.saved && !localStorage.getItem("loops.seen"); } catch (e) { return !init.saved; }
  })();
  let titleTap = { n: 0, t: 0 };

  return {
    immersive: true,
    vizMode: "mandala",                 // "mandala" | "space"
    vizUiVisible: true,
    sheet: null,
    isFullscreen: false,
    showWelcome: firstVisit,
    welcomeHiding: false,
    copied: false,
    breathOn: ls("loops.breath.on") === "1",
    breathPat: ls("loops.breath.pat") || "calm",
    section: ls("loops.section") || "scenes",
    expert: ls("loops.expert") === "1",
    expertToast: false,
    spatial: ls("loops.spatial") === "1",
    spatialToast: false,
    installPrompt: null,

    setImmersive: (v) => set({ immersive: upd(v, get().immersive) }),
    setVizMode: (v) => set({ vizMode: upd(v, get().vizMode) }),
    setVizUiVisible: (v) => set({ vizUiVisible: upd(v, get().vizUiVisible) }),
    setSheet: (v) => set({ sheet: upd(v, get().sheet) }),
    setIsFullscreen: (v) => set({ isFullscreen: upd(v, get().isFullscreen) }),
    setShowWelcome: (v) => set({ showWelcome: upd(v, get().showWelcome) }),
    setWelcomeHiding: (v) => set({ welcomeHiding: upd(v, get().welcomeHiding) }),
    setCopied: (v) => set({ copied: upd(v, get().copied) }),
    setInstallPrompt: (v) => set({ installPrompt: upd(v, get().installPrompt) }),

    setSection: (v) => {
      const next = upd(v, get().section);
      try { localStorage.setItem("loops.section", next); } catch (e) {}
      set({ section: next });
    },
    setBreathOn: (v) => {
      const next = upd(v, get().breathOn);
      try { localStorage.setItem("loops.breath.on", next ? "1" : "0"); } catch (e) {}
      set({ breathOn: next });
    },
    setBreathPat: (v) => {
      const next = upd(v, get().breathPat);
      try { localStorage.setItem("loops.breath.pat", next); } catch (e) {}
      set({ breathPat: next });
    },

    toggleSpatial: () => {
      const next = !get().spatial;
      try { localStorage.setItem("loops.spatial", next ? "1" : "0"); } catch (e) {}
      ENGINE.setSpatial(next);
      set({ spatial: next });
      if (next) { set({ spatialToast: true }); setTimeout(() => set({ spatialToast: false }), 2600); }
    },

    unlockExpert: () => {
      const now = Date.now();
      const s = titleTap;
      if (now - s.t > 600) s.n = 0;
      s.n += 1; s.t = now;
      if (s.n >= 3 && !get().expert) {
        s.n = 0;
        try { localStorage.setItem("loops.expert", "1"); } catch (e) {}
        set({ expert: true, expertToast: true });
        setTimeout(() => set({ expertToast: false }), 2400);
      }
    },

    install: () => {
      const p = get().installPrompt;
      if (!p) return;
      p.prompt();
      p.userChoice.finally(() => set({ installPrompt: null }));
    },

    share: () => {
      const url = location.href;
      const done = () => { set({ copied: true }); setTimeout(() => set({ copied: false }), 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else done();
    },

    begin: () => {
      try { localStorage.setItem("loops.seen", "1"); } catch (e) {}
      get()._play();
      set({ immersive: true, welcomeHiding: true });
      setTimeout(() => set({ showWelcome: false }), 950);
    },

    enterViz: () => {
      if (!ENGINE.playing) get()._play();
      set({ immersive: true });
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        const r = el.requestFullscreen();
        if (r && r.catch) r.catch(() => {});
      }
    },

    toggleFullscreen: () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        const r = el.requestFullscreen && el.requestFullscreen();
        if (r && r.catch) r.catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    },
  };
}

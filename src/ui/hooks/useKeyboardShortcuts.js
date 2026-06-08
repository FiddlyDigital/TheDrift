import { useEffect } from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// Global keyboard shortcuts for the immersive experience. Ignored while typing
// in a field, when a modifier is held, or while the welcome screen is up. When
// the Sound console or a sheet is open, only the keys that dismiss them apply.
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;

      const st = useDriftStore.getState();
      if (st.showWelcome) return;
      if (st.consoleOpen) {
        if (e.key === 's' || e.key === 'S' || e.key === 'Escape') st.setConsoleOpen(false);
        return;
      }
      if (st.sheet) {
        if (e.key === 'Escape') st.setSheet(null);
        return;
      }
      // let a focused button/link handle its own Space/Enter activation
      const isBtn = tag === 'BUTTON' || tag === 'A' || (t && t.getAttribute && t.getAttribute('role') === 'button');
      if (e.key === ' ' && isBtn) return;

      const sheet = (name) => st.setSheet((s) => (s === name ? null : name));
      switch (e.key) {
        case ' ': e.preventDefault(); st.toggle(); break;
        case 's': case 'S': st.setConsoleOpen(true); break;
        case 'b': case 'B': st.setBreathOn((v) => !v); break;
        case 'f': case 'F': st.toggleFullscreen(); break;
        case '2': st.setVizMode('mandala'); break;
        case '3': st.setVizMode('space'); break;
        case 't': case 'T': sheet('session'); break;
        case 'j': case 'J': sheet('journey'); break;
        case '?': sheet('help'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

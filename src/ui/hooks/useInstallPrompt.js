import { useEffect } from 'react';
import { useDriftStore } from '../store/useDriftStore.js';

// Capture the PWA install prompt event so the UI can offer an "Install" button.
export function useInstallPrompt() {
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); useDriftStore.getState().setInstallPrompt(e); };
    const onInstalled = () => useDriftStore.getState().setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
}

export const lsGet = (key, fallback = null) => { try { const v = localStorage.getItem(key); return v != null ? v : fallback; } catch { return fallback; } };
export const lsGetNum = (key, fallback) => { try { const v = localStorage.getItem(key); return v != null ? +v : fallback; } catch { return fallback; } };
export const lsGetJson = (key, fallback) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
export const lsSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
export const lsSetJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

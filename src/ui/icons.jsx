import React from 'react';

// ---- icons -----------------------------------------------------------
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
);
export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" /><rect x="13.6" y="5.5" width="3.4" height="13" /></svg>
);
export const DiceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" /><path d="M3 8.5 12 13l9-4.5M12 13v7" />
  </svg>
);
export const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1" />
  </svg>
);
export const InstallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18.5h14" />
  </svg>
);
export const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9V5.5a1.5 1.5 0 0 1 1.5-1.5H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);
export const FullscreenExitIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </svg>
);
export const VizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="12" cy="3.2" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16.6" cy="14.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
export const CubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
    <path d="M12 3 20 7.5v9L12 21 4 16.5v-9z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9" />
  </svg>
);
export const ReturnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 5l-7 7 7 7" />
  </svg>
);
export const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M4 9v6h3.5L13 19V5L7.5 9z" fill="currentColor" stroke="none" />
    <path d="M16.4 9.2a4 4 0 0 1 0 5.6M18.7 7a7 7 0 0 1 0 10" strokeLinecap="round" />
  </svg>
);
export const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
  </svg>
);
export const BreathIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="6.4" opacity="0.7" />
    <circle cx="12" cy="12" r="9.6" opacity="0.4" />
  </svg>
);
export const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M6 16.5c1-.9 1.6-2.3 1.6-4.2V11a4.4 4.4 0 0 1 8.8 0v1.3c0 1.9.6 3.3 1.6 4.2z" />
    <path d="M10.4 19.4a1.8 1.8 0 0 0 3.2 0" />
  </svg>
);
export const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5 7h9M18 7h1M5 12h1M10 12h9M5 17h12M20 17h-1" />
    <circle cx="16" cy="7" r="2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="17" r="2" fill="currentColor" stroke="none" />
  </svg>
);
export const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" />
    <path d="M8 17h6.5A3.5 3.5 0 0 0 18 13.5V8.2" strokeDasharray="0.1 3" />
  </svg>
);
export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 19h14" />
  </svg>
);
export const SunriseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18h16" />
    <path d="M7 14a5 5 0 0 1 10 0" />
    <path d="M12 4v3" /><path d="M5 8l1.5 1.5" /><path d="M19 8l-1.5 1.5" />
  </svg>
);
export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.4L6 20V5.5a1 1 0 0 1 1-1z" />
  </svg>
);

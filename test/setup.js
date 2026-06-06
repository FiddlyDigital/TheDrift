/* Vitest setup. Runs in every test's environment. The DOM stubs below only
   apply when a test opts into jsdom via `// @vitest-environment jsdom`; engine
   tests run in node and skip all of this. */
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');

  // jsdom has no rAF that drives our render loop; make it a no-op so the
  // animation loop sets up but never executes its body during tests.
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  } else {
    window.requestAnimationFrame = () => 0;
  }

  // jsdom canvas getContext is not implemented; return a no-op 2D context so
  // the renderer can be constructed without drawing.
  const stub2d = new Proxy({}, {
    get(_t, p) {
      if (p === 'canvas') return null;
      if (p === 'measureText') return () => ({ width: 0 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p === 'getImageData') return () => ({ data: [] });
      return () => {};
    },
    set() { return true; },
  });
  // jsdom doesn't implement media playback; the silent-audio shim calls these.
  if (window.HTMLMediaElement) {
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
  }

  // jsdom lacks URL.createObjectURL (used for the silent-audio media-session shim).
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:stub';
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

  if (window.HTMLCanvasElement) {
    window.HTMLCanvasElement.prototype.getContext = function (kind) {
      return kind === '2d' ? stub2d : null;
    };
  }
}

// js/core/motion.js
//
// Whether the reader has asked for less motion. Read once, at load: a
// change made with the page open takes effect on the next load.

export const reducedMotion = !!(window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches);

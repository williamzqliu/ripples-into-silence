// js/scenes/epilogue.js
//
// The last screen: its lines one at a time as the scene arrives, and the
// relief of the island beside them.

import { reducedMotion } from "../core/motion.js";

// ---------- the relief
//
// Drawn at 1.5 times its box. That reaches past the box on both sides,
// which the page margin absorbs on a wide screen; on a 1280 window it ran
// off the right edge and the page scrolled sideways. The image is not to be
// cropped, so the scale comes down instead, to what the margin on the right
// allows.
const IMAGE_SCALE = 1.5;
// And moved this far right, off the text, from what is left of the margin
// once it is scaled.
const IMAGE_SHIFT = 80;

function fitImage() {
  const box = document.querySelector(".epilogue-image");
  if (!box || !box.offsetWidth) return;
  box.style.scale = "1";
  box.style.translate = "0";
  const right = box.getBoundingClientRect().right;       // unscaled
  const room = document.body.clientWidth - right;
  const s = Math.max(1, Math.min(IMAGE_SCALE, 1 + (2 * room) / box.offsetWidth));
  box.style.scale = s.toFixed(3);
  const shift = Math.max(0, Math.min(IMAGE_SHIFT, room - (s - 1) * box.offsetWidth / 2));
  box.style.translate = `${Math.round(shift)}px 0`;
}

// ---------- the lines
//
// One at a time as the scene arrives, then the credits. The wait before
// each is the time to read the one before it, roughly, with a held breath
// before "But seeing is not reaching." and before "But 206 did not."
// Leaving the scene takes them all out; coming back plays them again.
const WAITS = [300, 750, 700, 950, 850, 1050, 1400, 950, 900];

export function initEpilogue() {
  const scene = document.getElementById("epilogue");
  if (!scene) return;
  const lines = [...scene.querySelectorAll(".epilogue-line")];
  let on = false;
  let timers = [];

  window.addEventListener("scenechange", () => {
    const leads = !scene.classList.contains("scene--away");
    if (leads === on) return;
    on = leads;
    timers.forEach(clearTimeout);
    timers = [];
    if (!on) {
      lines.forEach(line => line.classList.remove("is-in"));
      return;
    }
    let t = 0;
    lines.forEach((line, i) => {
      t += reducedMotion ? 0 : (WAITS[i] ?? 1500);
      timers.push(setTimeout(() => line.classList.add("is-in"), t));
    });
  });

  window.addEventListener("resize", fitImage);
  window.addEventListener("load", fitImage);
  fitImage();
}

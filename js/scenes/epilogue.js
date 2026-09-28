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
// Where the island's own middle is in its image, from the top: the relief
// sits a little low in the file, rows 221 to 1073 of 1200.
const ISLAND_MIDDLE = 0.539;

// And moved up or down so the island's middle is the screen's, as it is
// when the epilogue is the screen: the flex row centred the text and the
// image together between the nav and the credits, which put the island
// above the middle.
function fitImage() {
  const box = document.querySelector(".epilogue-image");
  const figure = box && box.querySelector(".epilogue-figure");
  if (!box || !box.offsetWidth || !figure) return;
  box.style.scale = "1";
  box.style.translate = "0";
  const right = box.getBoundingClientRect().right;       // unscaled
  const room = document.body.clientWidth - right;
  const s = Math.max(1, Math.min(IMAGE_SCALE, 1 + (2 * room) / box.offsetWidth));
  box.style.scale = s.toFixed(3);
  const shift = Math.max(0, Math.min(IMAGE_SHIFT, room - (s - 1) * box.offsetWidth / 2));

  const scene = document.getElementById("epilogue");
  const f = figure.getBoundingClientRect();
  const drop = scene.getBoundingClientRect().top + window.innerHeight / 2 - (f.top + f.height * ISLAND_MIDDLE);
  box.style.translate = `${Math.round(shift)}px ${Math.round(drop)}px`;
}

// ---------- the lines
//
// One at a time as the scene arrives, then the credits, an even beat apart.
// They play once per page load. A line that is in stays in: leaving the
// scene and coming back used to take them all out and play them again.
// Leaving before the last one is in only pauses them, and the rest follow
// on the way back.
const FIRST = 300;            // ms before the first line
const BEAT = 1000;            // ms between one line and the next
const CREDITS = 1200;         // and before the credits, a little longer

export function initEpilogue() {
  const scene = document.getElementById("epilogue");
  if (!scene) return;
  const lines = [...scene.querySelectorAll(".epilogue-line")];
  let on = false;
  let next = 0;                 // the first line not yet in
  let timers = [];

  window.addEventListener("scenechange", () => {
    const leads = !scene.classList.contains("scene--away");
    if (leads === on) return;
    on = leads;
    timers.forEach(clearTimeout);
    timers = [];
    if (!on) return;
    let t = 0;
    for (let i = next; i < lines.length; i++) {
      t += reducedMotion ? 0 : (i === 0 ? FIRST : i === lines.length - 1 ? CREDITS : BEAT);
      timers.push(setTimeout(() => { lines[i].classList.add("is-in"); next = i + 1; }, t));
    }
  });

  window.addEventListener("resize", fitImage);
  window.addEventListener("load", fitImage);
  fitImage();
}

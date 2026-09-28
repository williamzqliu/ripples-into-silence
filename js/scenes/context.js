// js/scenes/context.js
//
// Why Lampedusa. The text and the diagram are pinned side by side on one
// centre line and the section's scroll is divided between the steps: each
// gets --step-scroll of it, and the change is a crossfade on both sides.
//
// It used to be an IntersectionObserver per step with hand-set root
// margins. The middle step's were -60% top and bottom, a band of minus
// twenty per cent, so it only turned on by accident; the image changed by
// swapping one element's src behind a 0.1s fade, which read as a cut; and
// the paragraphs scrolled past the pinned diagram, so they were level with
// it for an instant and drifted away from it for the rest of their turn.

import { FADE_FROM, FADE_TO } from "../core/scenes.js";

// On the way out the last step and its diagram stay up and scroll away
// with the section, and only fade once the pair is this far up the screen.
// They used to fade the moment the pair came unstuck, so an invisible pair
// scrolled off and then the section's bottom padding followed it: 480px of
// scroll with nothing on screen at all at 1912x849. At 0.4 there was still
// a stretch with the top 58% of the screen empty above Eleven Years; by 0.2
// the pair is mostly off the top and the fade only finishes it.
const LEAVE_AT = 0.2;

// The first step's share of the pinned run, against the others' 1.
const FIRST_SHARE = 0.45;

let steps = [];
let imgs = [];
let graphic = null;
let container = null;

// The step that was up last time, so a step coming up out of nothing can
// skip the wait that is only there to let another paragraph leave first.
let lastActive = -1;

// The steps run on the scene's clock. They used to start when the pair
// came on screen at the bottom, which was right before scenes existed; with
// the scene hidden until its top is above FADE_FROM and not fully up until
// FADE_TO, the first paragraph spent its whole turn, 250px of scroll at
// 1897x815, with its scene at 26% or less, and the second had 30px fully
// seen. Now the first step shows while the scene fades in, and the three
// share the scroll from the moment the scene is fully up to the moment the
// pair comes unstuck.
function update() {
  const vh = window.innerHeight;
  const n = steps.length;

  const frame = graphic.getBoundingClientRect();
  const box = container.getBoundingClientRect();
  const stickyTop = parseFloat(getComputedStyle(graphic).top) || 0;
  const pinned = box.height - frame.height;        // px of scroll spent pinned

  // Measured on the section, the thing the scene fade is measured on. While
  // the pair rises it sits at the top of its box, below the section's top
  // padding; it pins when the box reaches stickyTop and comes unstuck
  // `pinned` px later.
  const section = container.parentElement;
  const secTop = section.getBoundingClientRect().top;
  const padTop = parseFloat(getComputedStyle(section).paddingTop) || 0;
  const fullyUp = vh * FADE_TO;                      // where the scene is at 1
  const u = fullyUp - secTop;                        // 0 as the scene arrives
  const run = fullyUp - (stickyTop - padTop - pinned);

  let active;
  if (secTop > vh * FADE_FROM) active = -1;          // scene not arriving yet
  else if (u < 0) active = 0;                        // fading in, with step one
  else if (u > run + 0.5) {                          // come unstuck
    active = frame.bottom < vh * LEAVE_AT ? n : n - 1;
  }
  else {
    // The pinned run, shared by weight. The first step also has the scene's
    // fade-in, so it takes a smaller share of the pinned part. The last
    // keeps a full one: cut short, the pair came unstuck while the
    // diagram before it was still fading out, and at speed that diagram
    // was seen sliding up the screen.
    // The held stretch at each end goes to the first and the last step.
    const hold = Math.min(run / 4, parseFloat(getComputedStyle(container).getPropertyValue("--edge-hold")) || 0);
    const weights = steps.map((_, i) => (i === 0 ? FIRST_SHARE : 1));
    const total = weights.reduce((s, w) => s + w, 0);
    let at = hold;
    active = n - 1;
    for (let i = 0; i < n; i++) {
      at += (run - 2 * hold) * weights[i] / total;
      if (u < at) { active = i; break; }
    }
  }

  if (active !== lastActive) {
    const fromBlank = !(lastActive >= 0 && lastActive < n);
    steps.forEach(s => s.classList.remove("from-blank"));
    imgs.forEach(i => i.classList.remove("from-blank"));
    if (fromBlank && steps[active]) {
      steps[active].classList.add("from-blank");
      const img = imgs.find(i => i.dataset.for === steps[active].dataset.img);
      if (img) img.classList.add("from-blank");
    }
    lastActive = active;
  }

  steps.forEach((step, i) => {
    step.classList.toggle("active", i === active);
    step.classList.toggle("past", i < active);
  });
  const id = steps[active] ? steps[active].dataset.img : null;
  // A diagram still fading out when the pair starts to move goes at once:
  // left to its fade, a quick scroll saw it slide up the screen.
  const moving = Math.abs(frame.top - stickyTop) > 0.5;
  imgs.forEach(img => {
    img.classList.toggle("visible", img.dataset.for === id);
    img.classList.toggle("cut", moving && img.dataset.for !== id);
  });
}

// The three diagrams share one 700 by 700 frame, drawn so that Lampedusa
// and its name are in the same place in each, and they are shown exactly as
// drawn. Each used to be moved so its own drawing was centred, which put
// the island somewhere different at every step.

// Where the nav's link lands, in scroll px: the moment the text and the
// diagram pin, with the scene fully up. The first step, whole, and where it
// stays for its share of the run.
export function contextLanding() {
  if (!graphic) return null;
  const section = container.parentElement;
  const stickyTop = parseFloat(getComputedStyle(graphic).top) || 0;
  const pin = container.getBoundingClientRect().top + window.scrollY - stickyTop;
  const arrived = section.getBoundingClientRect().top + window.scrollY - window.innerHeight * FADE_TO;
  return Math.max(pin, arrived);
}

export function initContext() {
  steps = [...document.querySelectorAll(".scrolly-step")];
  imgs = [...document.querySelectorAll(".scrolly-img")];
  graphic = document.querySelector(".scrolly-graphic");
  container = graphic && graphic.parentElement;
  if (!steps.length || !container) return;

  container.style.setProperty("--steps", steps.length);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

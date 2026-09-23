// js/scenes/opening/index.js
//
// The cover and the intro, over the ripple field. The field starts once the
// page is parsed; the intro's paragraphs surface one at a time as they come
// up the screen. This was a classic script at the foot of index.html, and
// main.js revealed the same paragraphs again at slightly different lines.

import { startRippleBackground } from "./rippleBackground.js";

function reveal() {
  const vh = window.innerHeight;
  const content = document.querySelector("#intro .content");
  if (content && content.getBoundingClientRect().top < vh * 0.95) {
    content.classList.add("revealed");
  }
  document.querySelectorAll(".intro-step").forEach((step, i) => {
    if (step.getBoundingClientRect().top < vh * 0.85 - i * 40) {
      step.classList.add("visible");
    }
  });
}

export function initOpening() {
  window.addEventListener("DOMContentLoaded", () => {
    startRippleBackground("#ripple-background");
  });
  window.addEventListener("scroll", reveal, { passive: true });
}

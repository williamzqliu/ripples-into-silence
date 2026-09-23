// js/sequence/onScene.js
//
// The sequence is about a minute long and it lives in a section the reader
// can leave at any moment. It used to deal with that by taking the scroll
// away for three and a half seconds, which is a jolt, and which did not
// help anyway: the first incident does not land until about fifteen
// seconds in, so a reader who kept going left the whole film playing to an
// empty room.
//
// So nothing is taken away. Every step of the sequence waits here instead.
// If the section is on screen the wait returns at once; if it is not, it
// holds until the reader comes back, and the film picks up where it stopped.

const SECTION = "#viz-section";

// A third of the viewport has to be the section. Less than that and the
// opening starts while it is still a sliver at the bottom of the screen.
const MIN_VISIBLE = 0.33;

export function isOnScene() {
  const el = document.querySelector(SECTION);
  if (!el) return true;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight;
  const shown = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
  if (shown <= 0) return false;
  return shown / Math.min(rect.height, viewport) >= MIN_VISIBLE;
}

export function whenOnScene() {
  if (isOnScene()) return Promise.resolve();

  return new Promise(resolve => {
    const check = () => {
      if (!isOnScene()) return;
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      resolve();
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
  });
}

export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

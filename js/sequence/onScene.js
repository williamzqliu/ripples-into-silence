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

const SECTION = "#sequence";

// Half the viewport has to be the section. Below that the reader is on
// their way into it or out of it rather than looking at it, so the
// sequence holds. When the nav reaches the top the section already fills
// 91 per cent of the screen, so the opening is free to start there.
const MIN_VISIBLE = 0.5;

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

/** A wait that only counts time while the section is on screen, so it
    stays in step with the year bar, which is measured the same way. */
export function sceneWait(ms) {
  return new Promise(resolve => {
    let left = ms;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (isOnScene()) left -= now - last;
      last = now;
      if (left <= 0) resolve();
      else setTimeout(tick, 50);
    };
    setTimeout(tick, 50);
  });
}

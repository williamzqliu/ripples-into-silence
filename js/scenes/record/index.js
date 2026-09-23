// js/scenes/record/index.js
//
// The Record: the island, the fifty kilometre circle, and the ninety-four
// incidents arriving in it. controller.js runs the sequence; this decides
// when it starts.
//
// It starts the moment the nav reaches the top, which is when the section
// arrives under it. The nav is sticky, though, so its top stays 0 for the
// whole page below this point: on its own it would start the opening for a
// reader who loaded halfway down the page and is reading the ending.
// isOnScene is what says the section is the thing on screen.
//
// The opening used to hold the page still for three and a half seconds by
// cancelling every scroll gesture, and it had a second way in: a poll that
// watched the nav, scrolled the page so the section lined up, waited 800ms
// and then started it. Both are gone. The section is long enough to stand
// in, the sequence waits for the reader (see onScene.js), and scrolling to
// the section is the one trigger.

import { runSceneIntro } from "./controller.js";
import { isOnScene } from "./onScene.js";

export function initRecord() {
  const nav = document.getElementById("main-nav");
  let started = false;

  // Nothing may start the opening until load has run: the synthetic scroll
  // event main.js sends while the modules are still being evaluated would
  // otherwise start it from any scroll position.
  let armed = false;

  function check() {
    if (started || !armed) return;
    if (nav.getBoundingClientRect().top <= 0 && isOnScene()) {
      started = true;
      runSceneIntro().catch(err => {
        console.error("The opening did not finish:", err);
      });
    }
  }

  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("load", () => { armed = true; });
}

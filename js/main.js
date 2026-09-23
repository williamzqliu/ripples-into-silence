// js/main.js

import { runSceneIntro } from "./sequence/controller.js";
import { isOnScene } from "./sequence/onScene.js";
import { drawYearDiscs } from './sequence/yearDiscs.js';
import { drawArrivalsField } from './sequence/arrivalsField.js';
import { startRippleBackground } from './sequence/rippleBackground.js';


window.addEventListener("DOMContentLoaded", () => {
  startRippleBackground("#ripple-background");
});



// The eleven years, further down the page. This replaced a line chart whose
// series was written into the source by hand: of its eleven values only 2024
// matched the data, and the paragraph beside it described the shape of the
// invented curve.
drawYearDiscs("#year-discs");

// 2024 at one dot per person: the 206 are 0.45 per cent of the field they
// are hidden in, until the rest of it goes.
drawArrivalsField("#arrivals-section", "#arrivals-canvas");

let animationStarted = false;

// Nothing may start the opening until load has run: the synthetic scroll
// event at the foot of this module fires during module evaluation, and
// without this gate it started the animation from any scroll position.
let armed = false;

// The opening used to hold the page still for three and a half seconds by
// cancelling every scroll gesture. It is gone. It was a jolt at the one
// moment the page is asking to be looked at, and it bought nothing: the
// sequence runs for over a minute and the first incident lands around
// fifteen seconds in, so the hold always let go long before there was
// anything to hold anybody for. The section is long enough to stand in now
// and the sequence waits for the reader instead. See sequence/onScene.js.

window.addEventListener('scroll', () => {
  const nav = document.querySelector('#main-nav');
  const navLinks = document.querySelectorAll('#main-nav .nav-link');
  const navTop = nav.getBoundingClientRect().top;

  if (navTop <= 0) {
    nav.classList.add('sticky-top', 'visible');
    navLinks.forEach((link, i) => {
      setTimeout(() => {
        link.classList.add('visible');
      }, i * 150);
    });

    // The opening starts the moment the nav reaches the top, which is when
    // the section arrives under it. The nav is sticky, though, so navTop
    // stays 0 for the whole page below this point: on its own it would
    // start the opening for a reader who loaded halfway down the page and
    // is reading the ending. isOnScene is what says the section is the
    // thing on screen.
    if (!animationStarted && armed && isOnScene()) {
      animationStarted = true;
      runSceneIntro().catch(err => {
        console.error('The opening did not finish:', err);
      });
    }
  }

  const windowH = window.innerHeight;

  const steps = document.querySelectorAll('.fade-step');
  steps.forEach((step, i) => {
    const rect = step.getBoundingClientRect();
    const triggerPoint = windowH * 0.95 - i * 15;
    if (rect.top < triggerPoint) {
      step.classList.add('visible');
    }
  });

  const introSteps = document.querySelectorAll('.intro-step');
  introSteps.forEach((step, i) => {
    if (!step) return;
    const rect = step.getBoundingClientRect();
    const triggerPoint = windowH * 0.8 - i * 30;
    if (step && rect.top < triggerPoint) {
      step.classList.add("visible");
    }
  });

  const rippleBG = document.getElementById("ripple-background");
  const cover = document.getElementById("cover");
  const intro = document.getElementById("intro");

  const coverRect = cover.getBoundingClientRect();
  const introRect = intro.getBoundingClientRect();

  const coverInView = coverRect.bottom > 0 && coverRect.top < windowH;
  const introInView = introRect.bottom > 0 && introRect.top < windowH;

  if (coverInView || introInView) {
    rippleBG.classList.remove("hidden");
  } else {
    rippleBG.classList.add("hidden");
  }
});

// The opening used to have a second way in: a poll that watched the nav,
// scrolled the page so the section lined up, waited 800ms and then started
// it. Three separate bugs came out of that one function and none out of the
// listener above, so it is gone. Scrolling to the section is the trigger.

window.addEventListener('load', () => {
  armed = true;
  // A refresh restores the scroll position and can put the reader straight
  // onto the section. The only check at that position ran below, during
  // module evaluation, when nothing may start yet, so nothing did until the
  // reader scrolled. Check again now, and once more after the browser has
  // had time to finish restoring the position. animationStarted keeps the
  // second check from starting it twice.
  requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
  setTimeout(() => window.dispatchEvent(new Event('scroll')), 300);
});

// run the scroll handler once, for the position we loaded at
window.dispatchEvent(new Event('scroll'));

// ---------- scrollytelling
//
// Which step owns the screen is worked out from where the steps are. It
// used to be an IntersectionObserver per step with hand-set root margins,
// and the middle step's were -60% top and bottom: a band of minus twenty
// per cent, so it only ever turned on by accident. The image changed by
// swapping one element's src and waiting for it to load, behind a 0.1s
// fade, which read as a cut. There is one image per step now, and the
// change is a crossfade.
const scrollySteps = [...document.querySelectorAll('.scrolly-step')];
const scrollyImgs = [...document.querySelectorAll('.scrolly-img')];
const scrollyGraphic = document.querySelector('.scrolly-graphic');

// A step takes over when its top comes above this line.
const TAKE_OVER_AT = 0.6;
// The last paragraph counts as read once its bottom is above this one.
const READ_AT = 0.3;

function updateScrolly() {
  if (!scrollySteps.length || !scrollyGraphic) return;
  const vh = window.innerHeight;

  let active = -1;
  scrollySteps.forEach((step, i) => {
    if (step.getBoundingClientRect().top < vh * TAKE_OVER_AT) active = i;
  });

  const last = scrollySteps[scrollySteps.length - 1].getBoundingClientRect();
  const textActive = last.bottom < vh * READ_AT ? scrollySteps.length : active;

  scrollySteps.forEach((step, i) => {
    step.classList.toggle('active', i === textActive);
    step.classList.toggle('past', i < textActive);
  });

  // The diagram fades out the moment it comes unstuck and starts to leave
  // with the section, and back in if the reader comes back up to it.
  const stickyTop = parseFloat(getComputedStyle(scrollyGraphic).top) || 0;
  const leaving = scrollyGraphic.getBoundingClientRect().top < stickyTop - 0.5;
  const id = !leaving && scrollySteps[active] ? scrollySteps[active].dataset.img : null;
  scrollyImgs.forEach(img => img.classList.toggle('visible', img.dataset.for === id));
}

window.addEventListener('scroll', updateScrolly, { passive: true });
window.addEventListener('resize', updateScrolly);
updateScrolly();

// The 206 against the 45,997 was drafted here as an isotype grid and left
// unfinished, writing into markup that was commented out, so it threw on
// every load and stopped the rest of this module. It is built now, in
// sequence/arrivalsField.js, at one dot per person.

  
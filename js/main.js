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

  // The stagger counts within a group, not down the whole page: numbered
  // globally, the ending's paragraphs would have waited on Eleven Years'.
  const steps = document.querySelectorAll('.fade-step');
  steps.forEach((step) => {
    const i = [...step.parentElement.children]
      .filter(c => c.classList.contains('fade-step')).indexOf(step);
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
// The text and the diagram are pinned side by side on one centre line and
// the section's scroll is divided between the steps: each gets
// --step-scroll of it, and the change is a crossfade on both sides.
//
// It used to be an IntersectionObserver per step with hand-set root
// margins. The middle step's were -60% top and bottom, a band of minus
// twenty per cent, so it only turned on by accident; the image changed by
// swapping one element's src behind a 0.1s fade, which read as a cut; and
// the paragraphs scrolled past the pinned diagram, so they were level with
// it for an instant and drifted away from it for the rest of their turn.
const scrollySteps = [...document.querySelectorAll('.scrolly-step')];
const scrollyImgs = [...document.querySelectorAll('.scrolly-img')];
const scrollyGraphic = document.querySelector('.scrolly-graphic');
const scrollyContainer = scrollyGraphic && scrollyGraphic.parentElement;
if (scrollyContainer) scrollyContainer.style.setProperty('--steps', scrollySteps.length);

// The first step starts to come up as soon as the pair is on screen. It
// used to wait until the pair was 60% of the way up, so the pair rose
// through the bottom of the screen invisible, 290px of scroll at 720 tall
// and 435px at 1080, straight after the main animation: an empty screen
// that read as the end of the page, and the first paragraph went by
// under a reader who had started scrolling faster.
const ARRIVE_AT = 1;

// On the way out the last step and its diagram stay up and scroll away
// with the section, and only fade once the pair is this far up the screen.
// They used to fade the moment the pair came unstuck, so an invisible pair
// scrolled off and then the section's bottom padding followed it: 480px of
// scroll with nothing on screen at all at 1912x849. At 0.4 there was still
// a stretch with the top 58% of the screen empty above Eleven Years; by 0.2
// the pair is mostly off the top and the fade only finishes it.
const LEAVE_AT = 0.2;

// The step that was up last time, so a step coming up out of nothing can
// skip the wait that is only there to let another paragraph leave first.
let lastActive = -1;

function updateScrolly() {
  if (!scrollySteps.length || !scrollyContainer) return;
  const vh = window.innerHeight;
  const n = scrollySteps.length;

  const frame = scrollyGraphic.getBoundingClientRect();
  const box = scrollyContainer.getBoundingClientRect();
  const stickyTop = parseFloat(getComputedStyle(scrollyGraphic).top) || 0;
  const pinned = box.height - frame.height;        // px of scroll spent pinned

  // One run, from the pair arriving to it coming unstuck, shared evenly.
  // While rising, the frame sits at the top of its box, so the box's top
  // says where the pair is in both phases. The first step used to get the
  // whole rise on top of its share: 860px of scroll against 500.
  const start = vh * ARRIVE_AT;
  const run = (start - stickyTop) + pinned;
  const u = start - box.top;

  let active;
  if (u < 0) active = -1;                           // not here yet
  else if (u > run + 0.5) {                         // come unstuck
    active = frame.bottom < vh * LEAVE_AT ? n : n - 1;
  }
  else active = Math.min(n - 1, Math.floor(u / (run / n)));

  if (active !== lastActive) {
    const fromBlank = !(lastActive >= 0 && lastActive < n);
    scrollySteps.forEach(s => s.classList.remove('from-blank'));
    scrollyImgs.forEach(i => i.classList.remove('from-blank'));
    if (fromBlank && scrollySteps[active]) {
      scrollySteps[active].classList.add('from-blank');
      const img = scrollyImgs.find(i => i.dataset.for === scrollySteps[active].dataset.img);
      if (img) img.classList.add('from-blank');
    }
    lastActive = active;
  }

  scrollySteps.forEach((step, i) => {
    step.classList.toggle('active', i === active);
    step.classList.toggle('past', i < active);
  });
  const id = scrollySteps[active] ? scrollySteps[active].dataset.img : null;
  scrollyImgs.forEach(img => img.classList.toggle('visible', img.dataset.for === id));
}

window.addEventListener('scroll', updateScrolly, { passive: true });
window.addEventListener('resize', updateScrolly);
updateScrolly();

// The diagrams share a 700 by 700 frame, but not where they are drawn in
// it: the 130km and corridor drawings sit in its lower half, centred
// about 130 units below the middle, so they hung low beside a centred
// paragraph. Each is measured once from its own SVG and moved so its drawn
// centre is the frame's, which survives a re-export from Figma.
async function centreDiagram(img) {
  try {
    const text = await (await fetch(img.getAttribute('src'))).text();
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden';
    holder.innerHTML = text;
    document.body.appendChild(holder);
    const svg = holder.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    svg.setAttribute('width', vb.width);
    svg.setAttribute('height', vb.height);

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    svg.querySelectorAll('path, circle, ellipse, rect, line, polygon, polyline, text').forEach(el => {
      const fill = el.getAttribute('fill');
      const stroke = el.getAttribute('stroke');
      if (fill === 'none' && (!stroke || stroke === 'none')) return;
      const b = el.getBBox();
      // A rect the size of the frame is a background, not part of the drawing.
      if (el.tagName === 'rect' && b.width >= vb.width - 10 && b.height >= vb.height - 10) return;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    });
    holder.remove();
    if (!isFinite(x0)) return;

    const fx = (vb.x + vb.width / 2 - (x0 + x1) / 2) / vb.width;
    const fy = (vb.y + vb.height / 2 - (y0 + y1) / 2) / vb.height;
    img.style.setProperty('--fx', fx.toFixed(4));
    img.style.setProperty('--fy', fy.toFixed(4));
  } catch (err) {
    // Left where Figma put it. Off-centre is better than missing.
  }
}
scrollyImgs.forEach(centreDiagram);

// ---------- the ending's relief
//
// The relief is drawn at 1.5 times its box. That reaches past the box on
// both sides, which the page margin absorbs on a wide screen; on a 1280
// window it ran off the right edge and the page scrolled sideways. The
// image is not to be cropped, so the scale comes down instead, to what the
// margin on the right allows.
const EPILOGUE_SCALE = 1.5;

function fitEpilogueImage() {
  const box = document.querySelector('.epilogue-image');
  if (!box || !box.offsetWidth) return;
  box.style.scale = '1';
  const right = box.getBoundingClientRect().right;       // unscaled
  const room = document.body.clientWidth - right;
  const s = Math.max(1, Math.min(EPILOGUE_SCALE, 1 + (2 * room) / box.offsetWidth));
  box.style.scale = s.toFixed(3);
}

window.addEventListener('resize', fitEpilogueImage);
window.addEventListener('load', fitEpilogueImage);
fitEpilogueImage();

// The 206 against the 45,997 was drafted here as an isotype grid and left
// unfinished, writing into markup that was commented out, so it threw on
// every load and stopped the rest of this module. It is built now, in
// sequence/arrivalsField.js, at one dot per person.

  
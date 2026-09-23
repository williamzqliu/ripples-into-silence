// js/core/nav.js
//
// The bar under the intro: it comes up as it reaches the screen, sticks at
// the top from there on, lights the section being read, and jumps to the
// section a link names. Its showing and sticking were split between a
// classic script in index.html and main.js, which each set the same classes
// on every scroll and queued a timer per link per scroll event.

import { reducedMotion } from "./motion.js";
import { contextLanding } from "../scenes/context.js";

const LINK_STAGGER = 150;            // ms between the links coming up

// ---------- showing, sticking, and the current section

function initBar(nav, links) {
  const intro = document.getElementById("intro");
  let shown = false;
  let timers = [];

  function update() {
    const vh = window.innerHeight;
    const navTop = nav.getBoundingClientRect().top;

    const show = navTop < vh;
    if (show !== shown) {
      shown = show;
      nav.classList.toggle("visible", show);
      timers.forEach(clearTimeout);
      timers = [];
      if (show) {
        links.forEach((link, i) => {
          timers.push(setTimeout(() => link.classList.add("visible"), i * LINK_STAGGER));
        });
      } else {
        links.forEach(link => link.classList.remove("visible"));
      }
    }
    const introBottom = intro.offsetTop + intro.offsetHeight;
    nav.classList.toggle("sticky-top", show && (window.scrollY > introBottom - 100 || navTop <= 0));

    // Light the link for the section being read: the one across a line a
    // third of the way down the screen.
    const line = vh * 0.35;
    links.forEach(link => {
      if (link.classList.contains("nav-title")) return;
      const target = document.querySelector(link.getAttribute("href"));
      const r = target && target.getBoundingClientRect();
      link.classList.toggle("is-current", !!r && r.top <= line && r.bottom > line);
    });
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// ---------- the jumps
//
// The links were plain anchors under `scroll-behavior: smooth`, so a jump
// from the top to the ending was a smooth scroll through every scene on
// the way, several seconds of it, and where it stopped was each section's
// top edge less a scroll-margin set by hand for two of the six: the
// others stopped with their heading under the nav, and Why Lampedusa
// stopped before its scene had faded in. Now each link goes where that
// section is read from, and a near one is a short glide while a far one
// is a cut: the page dips to the background, moves, and comes back up.

const GLIDE_MS = 450;
const GLIDE_WITHIN = 1.2;            // screens: further than this is a cut
const CUT_OUT_MS = 160;              // the dip; .scene-cut in base.css
const HEADING_GAP = 56;              // a heading's distance under the nav

// Where the page should be, in scroll px, to read the section.
function landingFor(id, navH) {
  const el = document.getElementById(id);
  if (!el) return null;
  const y = el.getBoundingClientRect().top + window.scrollY;
  const heading = el.querySelector(":scope > .page-width > h2");
  let target;
  if (id === "cover") target = 0;
  else if (id === "intro") target = y;
  else if (id === "context") target = contextLanding() ?? y - navH;
  else if (id === "epilogue") target = y;   // it is the last screen, whole
  else if (heading) {
    // A section that opens on its heading: the heading, a little way under
    // the nav. Its top padding is the gap from the section before, and
    // landing on the top edge left 11 Years' heading 168px down.
    target = heading.getBoundingClientRect().top + window.scrollY - navH - HEADING_GAP;
  }
  else target = y - navH;                   // the section's top under the nav
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.round(Math.min(Math.max(target, 0), max));
}

function initJumps(nav) {
  const cut = document.createElement("div");
  cut.className = "scene-cut";
  document.body.appendChild(cut);
  let jumping = null;

  const setScroll = y => window.scrollTo({ top: y, behavior: "instant" });

  function glide(to) {
    const from = window.scrollY;
    const t0 = performance.now();
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const id = {};
    jumping = id;
    (function step(now) {
      if (jumping !== id) return;
      const t = Math.min(1, (now - t0) / GLIDE_MS);
      setScroll(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else jumping = null;
    })(t0);
  }

  function cutTo(to) {
    const id = {};
    jumping = id;
    cut.classList.add("is-on");
    setTimeout(() => {
      if (jumping !== id) return;
      setScroll(to);
      // A timer, not a frame: a frame never comes in a tab that is not
      // drawing, and the page would stay covered.
      setTimeout(() => {
        cut.classList.remove("is-on");
        jumping = null;
      }, 30);
    }, CUT_OUT_MS);
  }

  function goTo(id, { instant = false } = {}) {
    const to = landingFor(id, nav.offsetHeight);
    if (to === null) return;
    const far = Math.abs(to - window.scrollY) > window.innerHeight * GLIDE_WITHIN;
    if (instant || reducedMotion) setScroll(to);
    else if (far) cutTo(to);
    else glide(to);
    history.replaceState(null, "", "#" + id);
  }

  nav.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return;
      event.preventDefault();
      goTo(id);
    });
  });

  // A wheel or a key during a glide hands the page back to the reader.
  ["wheel", "touchstart", "keydown"].forEach(type =>
    window.addEventListener(type, () => {
      if (jumping && !cut.classList.contains("is-on")) jumping = null;
    }, { passive: true }));

  // A link opened with a section in it lands where the nav would have put
  // it, once the page has its heights.
  window.addEventListener("load", () => {
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)) goTo(id, { instant: true });
  });
}

export function initNav() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;
  const links = [...nav.querySelectorAll(".nav-link")];
  initBar(nav, links);
  initJumps(nav);
}

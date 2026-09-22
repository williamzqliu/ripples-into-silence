// js/main.js

import { runSceneIntro } from "./sequence/controller.js";
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

// The opening is choreographed, so the page holds still while it establishes
// itself. It holds gently. It lets go after LOCK_MAX_MS whatever the sequence
// is doing, and sooner if the reader makes a deliberate move: the animation
// runs for about twelve seconds, which is far too long to take the scrollbar
// away from somebody.
const LOCK_MAX_MS = 3500;
// One notch of a trackpad is not an instruction to leave; a push is.
const WHEEL_RELEASE_PX = 60;
const TOUCH_RELEASE_PX = 24;
const RELEASE_KEYS = new Set([
  ' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'
]);

// Replaced while the lock is on, so unlockScroll and every release trigger
// go through the same teardown exactly once.
let releaseLock = () => { };

function lockScroll() {
  // `scrollbar-gutter: stable` keeps the width steady where it is supported,
  // and where it is not this puts back exactly what the vanishing scrollbar
  // took. It measures 0 in the supported case, so the two do not fight.
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;

  let wheeled = 0;
  let touchStart = null;

  const onWheel = (e) => {
    wheeled += Math.abs(e.deltaY);
    if (wheeled >= WHEEL_RELEASE_PX) releaseLock();
  };
  const onTouchStart = (e) => { touchStart = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (touchStart === null) return;
    if (Math.abs(e.touches[0].clientY - touchStart) >= TOUCH_RELEASE_PX) releaseLock();
  };
  const onKey = (e) => { if (RELEASE_KEYS.has(e.key)) releaseLock(); };

  const timer = setTimeout(() => releaseLock(), LOCK_MAX_MS);

  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('keydown', onKey);

  releaseLock = () => {
    clearTimeout(timer);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    releaseLock = () => { };
  };
}

function unlockScroll() {
  releaseLock();
}

window.addEventListener('scroll', () => {
  const nav = document.querySelector('#main-nav');
  const navLinks = document.querySelectorAll('#main-nav .nav-link');
  const navTop = nav.getBoundingClientRect().top;

  // The nav is sticky, so navTop is 0 for the whole eight thousand pixels
  // below this point. It says the reader has come past the top of the page;
  // it does not say where they are. The opening has to key off its own
  // section, or it plays over whatever the reader happens to be reading.
  const vizSection = document.querySelector('#viz-section');
  const vizRect = vizSection.getBoundingClientRect();
  const onTheAnimation = vizRect.top <= 0 && vizRect.bottom > 0;

  // Belt as well as braces. The opening overlay is fixed and full screen, so
  // if it is ever up while the reader is somewhere else it covers whatever
  // they are reading. The hold can be broken out of mid-opening, so this is
  // reachable; it cannot show outside its own section now whatever happens.
  // Only once the opening has begun: before that the overlay is harmless,
  // its two children sit at opacity 0, and hiding it here would take the
  // island away before it ever got to play.
  if (animationStarted && !onTheAnimation) {
    const overlay = document.getElementById('lampedusa-intro');
    if (overlay && overlay.style.display !== 'none') overlay.style.display = 'none';
  }

  if (navTop <= 0) {
    nav.classList.add('sticky-top', 'visible');
    navLinks.forEach((link, i) => {
      setTimeout(() => {
        link.classList.add('visible');
      }, i * 150);
    });

    if (!animationStarted && armed && onTheAnimation) {
      animationStarted = true;
      lockScroll();
      // The lock has to come off even if the opening falls over, or the page
      // keeps the scrollbar.
      runSceneIntro().then(unlockScroll, (err) => {
        unlockScroll();
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
});

// run the scroll handler once, for the position we loaded at
window.dispatchEvent(new Event('scroll'));

const scrollySteps = document.querySelectorAll('.scrolly-step');
const imgFront = document.getElementById('scrolly-image-front');
const imgBack = document.getElementById('scrolly-image-back');
const scrollyGraphic = document.querySelector('.scrolly-graphic');

let currentImage = ''; // which scrollytelling frame is up

if (scrollySteps.length && imgFront && imgBack && scrollyGraphic) {
  // The graphic used to be hidden from here, because it was fixed and would
  // otherwise float over the rest of the page. It is sticky now, so its own
  // container keeps it in place and this listener could only get the timing
  // wrong at the section's edges.

  // swap the image as each paragraph takes over
  scrollySteps.forEach((step, index) => {
    let topMargin = '-60%';
    let bottomMargin = '-60%';
  
    // the first frame waits until its paragraph is well into view
    if (index === 0) {
      topMargin = '-40%'; 
      bottomMargin = '-30%';
    }
  
    // and the last one lets go early
    if (index === scrollySteps.length - 1) {
      topMargin = '-40%'; 
      bottomMargin = '-40%';
    }
  
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scrollySteps.forEach(step => step.classList.remove('active'));
          entry.target.classList.add('active');
  
          const imgId = entry.target.dataset.img;
          const newSrc = `./assets/${imgId}.svg`;
  
          if (newSrc === currentImage) return;
          currentImage = newSrc;
  
          imgBack.src = imgFront.src;
          imgBack.classList.add('visible');
          imgFront.classList.remove('visible');
  
          imgFront.src = newSrc;
          imgFront.alt = imgId;
  
          imgFront.onload = () => {
            imgFront.classList.add('visible');
            imgBack.classList.remove('visible');
          };
        }
      });
    }, {
      rootMargin: `${topMargin} 0px ${bottomMargin} 0px`,
      threshold: 0
    });
  
    observer.observe(step);
  });
  
}

// The 206 against the 45,997 was drafted here as an isotype grid and left
// unfinished, writing into markup that was commented out, so it threw on
// every load and stopped the rest of this module. It is built now, in
// sequence/arrivalsField.js, at one dot per person.

  
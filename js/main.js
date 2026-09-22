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

// Reloading part way down the page should not haul the reader back to the
// top and play the opening at them. Read here and again on load, because a
// browser restoring the previous scroll position may do it after this module
// has already run.
let loadedAtTop = window.scrollY <= 100;

// Nothing may start the opening until load has confirmed where the page
// actually opened. The synthetic scroll event further down fires before that,
// and without this gate it started the animation from any scroll position.
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
  document.body.style.overflow = 'hidden';

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
    releaseLock = () => { };
  };
}

function unlockScroll() {
  releaseLock();
}

function showReplayButton() {
  const btn = document.getElementById('replay-btn');
  if (btn) {
    btn.style.opacity = 1;
    btn.style.pointerEvents = 'auto';
  }
}

function hideReplayButton() {
  const btn = document.getElementById('replay-btn');
  if (btn) {
    btn.style.opacity = 0;
    btn.style.pointerEvents = 'none';
  }
}

function resetVizArea() {
  const viz = document.getElementById('viz');
  if (viz) viz.innerHTML = '';
}

window.addEventListener('scroll', () => {
  const nav = document.querySelector('#main-nav');
  const navLinks = document.querySelectorAll('#main-nav .nav-link');
  const navTop = nav.getBoundingClientRect().top;

  // Suppressed by a reload below the fold, but scrolling back to the top is
  // the reader choosing to start from the beginning, so arm it again.
  if (!loadedAtTop && window.scrollY <= 100) loadedAtTop = true;

  if (navTop <= 0) {
    nav.classList.add('sticky-top', 'visible');
    navLinks.forEach((link, i) => {
      setTimeout(() => {
        link.classList.add('visible');
      }, i * 150);
    });

    if (!animationStarted && armed && loadedAtTop) {
      animationStarted = true;
      lockScroll();
      runSceneIntro().then(() => {
        unlockScroll();
        showReplayButton();
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

function autoScrollAndStartAnimation() {
  const nav = document.querySelector('#main-nav');
  const navLinks = document.querySelectorAll('#main-nav .nav-link');

  const check = () => {
    if (animationStarted || !nav || !armed || !loadedAtTop) return;

    const navTop = nav.getBoundingClientRect().top;

    if (navTop < window.innerHeight * 0.6 && navTop > 0) {
      const scrollTarget = window.scrollY + navTop;

      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });

      let aborted = false;
      const abort = () => { aborted = true; };
      window.addEventListener('wheel', abort, { passive: true });
      window.addEventListener('touchmove', abort, { passive: true });

      setTimeout(() => {
        window.removeEventListener('wheel', abort);
        window.removeEventListener('touchmove', abort);
        if (animationStarted || aborted) return;

        animationStarted = true;
        nav.classList.add('sticky-top', 'visible');
        navLinks.forEach((link, i) => {
          setTimeout(() => {
            link.classList.add('visible');
          }, i * 150);
        });

        lockScroll();
        runSceneIntro().then(() => {
          unlockScroll();
          showReplayButton();
        });
      }, 800);
    } else {
      requestAnimationFrame(check);
    }
  };

  requestAnimationFrame(check);
}

// A reload part way down the page should not lock the reader in place and
// play the opening at them, so the automatic run is only armed at the top.
window.addEventListener('load', () => {
  loadedAtTop = loadedAtTop && window.scrollY <= 100;
  armed = true;

  setTimeout(() => {
    autoScrollAndStartAnimation();
  }, 200);
});

// run the scroll handler once, for the position we loaded at
window.dispatchEvent(new Event('scroll'));

const scrollySteps = document.querySelectorAll('.scrolly-step');
const imgFront = document.getElementById('scrolly-image-front');
const imgBack = document.getElementById('scrolly-image-back');
const scrollyGraphic = document.querySelector('.scrolly-graphic');
const scrollyContainer = document.querySelector('.scrolly-section');

let currentImage = ''; // which scrollytelling frame is up

if (scrollySteps.length && imgFront && imgBack && scrollyGraphic) {
  // fade the image out when the whole scrollytelling block leaves
  window.addEventListener('scroll', () => {
    const rect = scrollyContainer.getBoundingClientRect();
    const screenH = window.innerHeight;

    const fullyInView = rect.top < screenH * 0.5 && rect.bottom > screenH * 0.5;

    if (fullyInView) {
      scrollyGraphic.classList.remove('hidden');
    } else {
      scrollyGraphic.classList.add('hidden');
    }
  });

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

  
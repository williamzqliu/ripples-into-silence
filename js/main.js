// js/main.js

import { runSceneIntro } from "./sequence/controller.js";
import { drawDeathSurvivalChart } from './sequence/deathSurvivalChart.js';
import { startRippleBackground } from './sequence/rippleBackground.js';


window.addEventListener("DOMContentLoaded", () => {
  startRippleBackground("#ripple-background");
});



// The eleven year chart, further down the page.
drawDeathSurvivalChart("#death-chart-container");

let animationStarted = false;
let allowAutoAnimation = true; // on by default

function lockScroll() {
  document.body.style.overflow = 'hidden';
  const nav = document.getElementById('main-nav');
  if (nav) nav.style.pointerEvents = 'none';
}

function unlockScroll() {
  document.body.style.overflow = '';
  const nav = document.getElementById('main-nav');
  if (nav) nav.style.pointerEvents = 'auto';
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

  if (navTop <= 0) {
    nav.classList.add('sticky-top', 'visible');
    navLinks.forEach((link, i) => {
      setTimeout(() => {
        link.classList.add('visible');
      }, i * 150);
    });

    if (!animationStarted && allowAutoAnimation) {
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
    if (animationStarted || !nav || !allowAutoAnimation) return;

    const navTop = nav.getBoundingClientRect().top;

    if (navTop < window.innerHeight * 0.6 && navTop > 0) {
      const scrollTarget = window.scrollY + navTop;

      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });

      setTimeout(() => {
        if (animationStarted) return;

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
  if (window.scrollY > 100) {
    allowAutoAnimation = false; // reloaded below the fold
  }

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

// An isotype grid for the 206 dead against the 45,997 who arrived was drafted
// and then set aside: the markup it wrote into is commented out in index.html,
// so the two calls threw on every load and stopped the rest of this module.
// Removed rather than guarded, because there is nothing left for it to fill.

  
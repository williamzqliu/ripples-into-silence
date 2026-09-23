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

  
// js/main.js
//
// The entry point. Each scene sets itself up, in page order; the shared
// machinery (the scene crossfade, the float-in, the nav) goes round them.
// See README.md for where everything lives.

import { initScenes } from "./core/scenes.js";
import { initReveal } from "./core/reveal.js";
import { initNav } from "./core/nav.js";

import { initOpening } from "./scenes/opening/index.js";
import { initRecord } from "./scenes/record/index.js";
import { initContext } from "./scenes/context.js";
import { initElevenYears } from "./scenes/elevenYears.js";
import { initIn2024 } from "./scenes/in2024.js";
import { initEpilogue } from "./scenes/epilogue.js";

// First: every later scroll handler that asks whether its scene leads
// reads what this scroll's crossfade just decided.
initScenes();

initOpening();
initRecord();
initContext();
initElevenYears();
initIn2024();
initEpilogue();

// After the scenes, so a paragraph floats in on the same scroll its scene
// takes the lead.
initReveal();
initNav();

// A refresh restores the scroll position, and can put the reader straight
// into a scene. Everything is checked once now, for the position the page
// loaded at, and again after load, once the browser has had time to finish
// restoring it: the record in particular may not start before load.
window.dispatchEvent(new Event("scroll"));
window.addEventListener("load", () => {
  requestAnimationFrame(() => window.dispatchEvent(new Event("scroll")));
  setTimeout(() => window.dispatchEvent(new Event("scroll")), 300);
});

// Summary numbers are generated from the same snapshot as every scene.
fetch("./data/summary.json").then(r => { if (!r.ok) throw new Error("Summary unavailable"); return r.json(); }).then(s => {
  const latest = s.years.at(-1);
  for (const [key, value] of Object.entries({ "total-records": s.records, "total-people": s.total, "latest-records": latest.records, "latest-people": latest.total })) {
    document.querySelectorAll(`[data-${key}]`).forEach(el => { el.textContent = value.toLocaleString("en-US"); });
  }
}).catch(console.error);

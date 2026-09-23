// js/sequence/updateStats.js
//
// The two running counters in the corners.
//
// They used to be incremented, one call per incident, each with its own
// animation state and a module-level running total. That only works while
// the record can go one way. It is released by scroll now, and scroll goes
// back, so the counters are set from how many incidents are on screen
// rather than nudged by the last one to arrive.

const format = d3.format(",d");

let shownIncidents = 0;
let shownDeaths = 0;
let target = { incidents: 0, deaths: 0 };
let frame = null;

// Fast enough to feel attached to the scroll, slow enough that the digits
// are legible on the way. A d3 transition per incident was restarting
// itself several times a second under a steady scroll and never arriving.
const CATCH_UP = 0.18;

export function setTotals(incidents, deaths) {
  target = { incidents, deaths };
  if (frame === null) frame = requestAnimationFrame(step);
}

function step() {
  shownIncidents += (target.incidents - shownIncidents) * CATCH_UP;
  shownDeaths += (target.deaths - shownDeaths) * CATCH_UP;

  const doneI = Math.abs(target.incidents - shownIncidents) < 0.5;
  const doneD = Math.abs(target.deaths - shownDeaths) < 0.5;
  if (doneI) shownIncidents = target.incidents;
  if (doneD) shownDeaths = target.deaths;

  const incident = document.getElementById("incident-count");
  const death = document.getElementById("death-count");
  if (incident) incident.textContent = format(Math.round(shownIncidents));
  if (death) death.textContent = format(Math.round(shownDeaths));

  frame = (doneI && doneD) ? null : requestAnimationFrame(step);
}

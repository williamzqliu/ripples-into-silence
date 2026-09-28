// js/scenes/elevenYears.js
//
// Twelve years, one disc each, every disc the same fifty kilometre circle as
// the main sequence and read off the same two rules: how far out a mark sits
// is how far out the incident was, how big it is is how many people were
// lost. Put side by side that makes the years comparable at a glance, which
// a line of totals cannot do.
//
// This replaces a chart whose yearly series was written into the source by
// hand and matched the data in one year out of eleven. (The file keeps the
// name it had when the record ran to eleven years.)
//
// The discs are all one size, three rows of four, every frame drawn alike. The latest year's frame
// sends out a slow ripple, the island's pulse in the epilogue, because the
// record is not closed: the losses go on past its end. Any year can be
// opened large, with its rings and a figure for every mark.

import { recordTooltip, showTooltip } from "../data/tooltip.js";
import {
  RADIUS_KM, radiusFractionFor,
  GOLDEN_ANGLE, CROSS_COLOUR,
  DISTANCE_RINGS_KM
} from "../config.js";

import { loadAndProcessData } from "../data/incidents.js";
import { reducedMotion as REDUCED } from "../core/motion.js";

// Rows, top to bottom. On an eight column grid each disc spans two; a
// shorter row would be inset by a column for each disc it is short.
const ROWS = [4, 4, 4];
const GRID_COLUMNS = 8;

// Drawing units. The small discs are drawn at a radius of 100 and the open
// one at 300, the main sequence's own, so its marks are the sequence's size.
// CSS sets how large either is on screen.
const SMALL_R = 100;
const LARGE_R = 300;

// The smallest mark, in drawing units. At a small disc's scale a five-death
// incident came out a pixel and a half across.
const MIN_MARK = 2.6;

// No text in the open disc comes out under this on screen.
const MIN_TEXT_PX = 14;
const RING_LABEL_UNITS = 15;


// Each disc plays the main sequence in miniature as it comes on screen: the
// circle opens out of the cross, then the year's incidents come in one by
// one, each a line from the rim whose tail catches up with its head, then a
// ripple where it lands. However many incidents a year holds, the whole
// disc is done in about a second and a half.
const OPEN_MS = 600;
const FLY_MS = 380;
const TAIL_MS = 260;
const RUN_MS = 1100;           // the spread of launch times across one disc
const STEP_MAX_MS = 110;       // and the longest gap between two of them

// Two steps. As a cell comes above this line it floats in and its disc
// opens, the frame and the cross, empty. The records fly in once the whole
// grid is pinned, all twelve together, a year a beat after the one before.
// They used to fly in row by row as the rows scrolled up, so the first row
// had finished before the last was on screen and no reader saw the twelve
// years fill side by side.
const PLAY_AT = 0.9;
const FILL_STAGGER = 90;       // ms from one year's records to the next's
const pending = new Set();     // cells not yet opened
const unfilled = new Set();    // opened, records not yet flown in
// Until the reader moves the page, whatever is on screen is where the page
// opened: a reload or a link that lands on the discs. Waiting for the pin
// there left the discs empty until the reader happened to scroll to it, so
// those fill at once. Discs the reader scrolls to still wait for the pin.
let landed = true;
const moved = () => { landed = false; };

function checkDiscs() {
  const vh = window.innerHeight;
  const track = document.querySelector(".people-track");
  const stage = document.querySelector(".people-stage");
  const pinned = track && stage &&
    track.getBoundingClientRect().top <= (parseFloat(getComputedStyle(stage).top) || 0) + 1;
  for (const node of pending) {
    if (node.closest('.scene--away')) continue;   // wait for its scene
    const r = node.getBoundingClientRect();
    if ((r.top < vh * PLAY_AT && r.bottom > 0) || pinned) {
      pending.delete(node);
      // The cell's float-in goes with its disc. Left to core/reveal.js,
      // whose stagger lowers the line for each later cell, the last row
      // never came up on a short screen, where the grid is pinned and
      // does not rise any further.
      node.classList.add("visible");
      node.__open();
      unfilled.add(node);
    }
  }
  if (!(pinned || landed) || !unfilled.size) return;
  [...unfilled].forEach((node, k) => node.__fill(k * FILL_STAGGER));
  unfilled.clear();
}

// Every disc still waiting, drawn at once in its final state. The people
// scene calls this as it takes the marks over, so a reader who arrives
// past the discs does not see marks appear from nowhere on the way back.
export function settleDiscs() {
  for (const node of [...pending, ...unfilled]) {
    pending.delete(node); unfilled.delete(node);
    node.classList.add("visible");
    node.__settle();
  }
}
export function initElevenYears() {
  for (const type of ["wheel", "touchmove", "keydown", "pointerdown"])
    window.addEventListener(type, moved, { passive: true, once: true });
  window.addEventListener("scroll", checkDiscs, { passive: true });
  window.addEventListener("resize", checkDiscs);
  window.addEventListener("scenechange", checkDiscs);
  window.addEventListener("resize", fitRingLabels);
  drawYearDiscs("#year-discs");
}

async function drawYearDiscs(containerId) {
  const root = d3.select(containerId);
  if (root.empty()) return;
  root.html("");

  const { paths } = await loadAndProcessData();

  const byYear = d3.group(paths, d => d.year);
  const years = [...byYear.keys()].sort((a, b) => a - b);

  // Angle carries nothing here either, so each year gets its own golden
  // angle walk down its own radius order and fills its own disc evenly.
  for (const y of years) {
    [...byYear.get(y)]
      .sort((a, b) => a.disappearRatio - b.disappearRatio)
      .forEach((d, k) => { d.discAngle = (k * GOLDEN_ANGLE) % (2 * Math.PI); });
  }

  const latest = years.at(-1);

  const grid = root.append("div").attr("class", "year-discs");

  // Row by row, in year order; any years past the eleven go on in fours.
  let i = 0, row = 0;
  while (i < years.length) {
    const count = Math.min(ROWS[row] ?? 4, years.length - i);
    const inset = (GRID_COLUMNS / 2 - count);
    for (let k = 0; k < count; k++, i++) {
      const y = years[i];
      cell(grid, y, byYear.get(y), 1 + inset + k * 2, y === latest);
    }
    row++;
  }

  // The cells carry .fade-step, which core/reveal.js reveals on scroll, and the
  // discs play on scroll. Both checks may already have run before these
  // existed.
  window.dispatchEvent(new Event("scroll"));
}

function figures(rows) {
  const dead = d3.sum(rows, d => d.dead);
  return `${rows.length} ${rows.length === 1 ? "record" : "records"}<br />` +
    `${dead} dead or missing`;
}


// One year: the disc, with its year and figures under it. The whole cell
// opens the year large.
function cell(grid, year, rows, column, isLatest) {
  const box = grid.append("div")
    .attr("class", "year-disc fade-step")
    .style("grid-column", `${column} / span 2`)
    .attr("role", "button")
    .attr("tabindex", 0)
    .attr("aria-label", `Open ${year}`);

  const holder = box.append("div").attr("class", "year-disc__plot");
  box.append("div").attr("class", "year-disc__label").html(`
    <div class="year-disc__year">${year}</div>
    <div class="year-disc__figures">${figures(rows)}</div>`);

  const play = disc(holder, rows, year, SMALL_R, isLatest);
  const node = box.node();
  if (REDUCED) play(true);
  node.__open = () => play.open(REDUCED);
  node.__fill = wait => play.fill(REDUCED, wait);
  node.__settle = () => play(true);
  pending.add(node);

  const open = () => openYear(year, rows, node);
  box.on("click", open)
    .on("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
}

function showTip(event, d) {
  showTooltip(event, recordTooltip(d));
}

function hideTip() {
  d3.select("#tooltip").style("opacity", 0);
}

// One disc, drawn at radius r in its own units. The large one also carries
// the sequence's 25 and 10 kilometre rings, and a label on each.
function disc(holder, rows, year, r, pulse = false) {
  const big = r === LARGE_R;
  const pad = big ? 24 : 3;       // the large one's pad holds the 50 km label
  const size = (r + pad) * 2;
  const svg = holder.append("svg")
    .attr("viewBox", `0 0 ${size} ${size}`)
    .attr("role", "img")
    .attr("aria-label",
      `${year}: ${rows.length} records with coordinates within ${RADIUS_KM} kilometres of the reference point, ` +
      `${d3.sum(rows, d => d.dead)} people dead or missing.`);

  const c = size / 2;
  const scale = r / 300;          // the main sequence draws this at 300px
  const u = big ? 1 : 1.3;        // stroke units: the small disc is drawn down

  // The fifty kilometre frame, the same dashed circle as the sequence.
  // Starts closed: it opens out of the cross when the disc plays.
  const frame = svg.append("circle")
    .attr("class", "year-disc__frame")
    .attr("cx", c).attr("cy", c).attr("r", 0)
    .attr("fill", "none")
    .attr("stroke-width", (big ? 2 : 1.2) * u)
    .attr("stroke-dasharray", big ? "6 6" : "4 5");

  // The latest year's ripple: two rings out from the frame and a rest, the
  // rhythm of the island's pulse in the epilogue. Switched on once the
  // frame has opened.
  const ripples = pulse ? [0, 1].map(() => svg.insert("circle", ".year-disc__frame")
    .attr("class", "year-disc__ripple")
    .attr("cx", c).attr("cy", c).attr("r", r)
    .attr("fill", "none")
    .attr("stroke-width", 1.2 * u)) : [];
  const startRipples = () => ripples.forEach(g => g.classed("is-on", true));

  const rings = big ? DISTANCE_RINGS_KM.map(km => {
    const rr = r * radiusFractionFor(km);
    return svg.append("circle")
      .attr("cx", c).attr("cy", c).attr("r", rr)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.14)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 6")
      .attr("opacity", 0);
  }) : [];

  const ringLabels = big ? [RADIUS_KM, ...DISTANCE_RINGS_KM].map(km => {
    const rr = km === RADIUS_KM ? r : r * radiusFractionFor(km);
    return svg.append("text")
      .attr("class", "year-disc__ring-label")
      .attr("x", c).attr("y", c - rr - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", RING_LABEL_UNITS)
      .text(`${km} km`)
      .attr("opacity", 0);
  }) : [];

  // Each mark is a solid disc, as large as the loss. The thin ring the
  // sequence leaves round each one, as bright as the loss is large, said
  // again what the size says, so it is not drawn here. The line only
  // appears in flight.
  //
  // One group per mark, made now and drawn furthest first, so the marks
  // nearest the island sit on top whatever order they land in.
  const marks = [...rows]
    .sort((a, b) => b.disappearRatio - a.disappearRatio)
    .map(d => {
      const q = radiusFractionFor(d.distance);
      return {
        d,
        x: c + Math.cos(d.discAngle) * r * q,
        y: c + Math.sin(d.discAngle) * r * q,
        rimX: c + Math.cos(d.discAngle) * r,
        rimY: c + Math.sin(d.discAngle) * r,
        r: Math.max(MIN_MARK, d.radius * scale),
        g: svg.append("g").attr("class", "year-disc__mark"),
      };
    });

  // Hover targets, over everything, smallest last so a small mark inside a
  // large one can still be reached. The mark under the pointer goes yellow,
  // and in the opened disc the others dim so the one being read stands out.
  for (const m of [...marks].sort((a, b) => b.r - a.r)) {
    svg.append("circle")
      .attr("data-record-id", m.d.id)
      .attr("data-mark-radius", m.r)
      .attr("cx", m.x).attr("cy", m.y).attr("r", m.r + 4 * u)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", () => { m.g.classed("is-hot", true); svg.classed("has-hot", big); })
      .on("mousemove", (event) => showTip(event, m.d))
      .on("mouseleave", () => { m.g.classed("is-hot", false); svg.classed("has-hot", false); hideTip(); });
  }

  // Lampedusa, the same cross the sequence marks it with.
  const arm = big ? 8 : 4;
  const cross = svg.append("g").attr("opacity", 0).style("pointer-events", "none");
  cross.append("line").attr("x1", c - arm).attr("y1", c).attr("x2", c + arm).attr("y2", c)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5 * u);
  cross.append("line").attr("x1", c).attr("y1", c - arm).attr("x2", c).attr("y2", c + arm)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5 * u);

  // The mark as it stays.
  function settle(m, animate) {
    const core = m.g.append("circle")
      .attr("class", "year-disc__core")
      .attr("cx", m.x).attr("cy", m.y)
      .attr("r", animate ? 0 : m.r)
      .attr("fill", "#FFFFFF").attr("fill-opacity", 0.9);
    if (!animate) return;

    core.transition().duration(220).ease(d3.easeCubicOut).attr("r", m.r);
    // and the splash, which spreads and goes
    m.g.append("circle")
      .attr("cx", m.x).attr("cy", m.y).attr("r", m.r)
      .attr("fill", "#FFFFFF").attr("opacity", 0.6)
      .transition().duration(900).ease(d3.easeCubicOut)
      .attr("r", m.r * 3.2).attr("opacity", 0)
      .remove();
  }

  // Opening the disc and flying its records in are two steps, so the grid
  // can open as it scrolls up and fill once it is still. play() does both.
  let opened = false, openedAt = 0, filled = false;
  function open(instant) {
    if (opened) return;
    opened = true; openedAt = performance.now();
    if (instant) {
      frame.attr("r", r);
      cross.attr("opacity", 0.75);
      rings.forEach(g => g.attr("opacity", 1));
      ringLabels.forEach(t => t.attr("opacity", 1));
      startRipples();
      return;
    }
    frame.transition().duration(OPEN_MS).ease(d3.easeCubicOut).attr("r", r)
      .on("end", startRipples);
    cross.transition().duration(OPEN_MS * 0.7).attr("opacity", 0.75);
    rings.forEach((g, k) => g.transition().delay(OPEN_MS * 0.4 + k * 150)
      .duration(OPEN_MS).attr("opacity", 1));
    ringLabels.forEach((t, k) => t.transition().delay(OPEN_MS * 0.4 + k * 150)
      .duration(OPEN_MS).attr("opacity", 1));
  }

  function fill(instant, wait = 0) {
    if (filled) return;
    open(instant);
    filled = true;
    if (instant) { marks.forEach(m => settle(m, false)); return; }
    // Not before the frame they land in has mostly opened.
    const start = Math.max(wait, openedAt + OPEN_MS * 0.6 - performance.now());
    // In the order they happened, which is the order the rows are in.
    const byDate = marks.slice().sort((a, b) => rows.indexOf(a.d) - rows.indexOf(b.d));
    const step = Math.min(STEP_MAX_MS, RUN_MS / Math.max(1, byDate.length));
    byDate.forEach((m, i) => {
      const line = m.g.append("line")
        .attr("x1", m.rimX).attr("y1", m.rimY)
        .attr("x2", m.rimX).attr("y2", m.rimY)
        .attr("stroke", "rgba(255,255,255,0.55)")
        .attr("stroke-width", (big ? 1.5 : 0.8) * u)
        .attr("stroke-linecap", "round");
      line.transition()
        .delay(start + i * step)
        .duration(FLY_MS).ease(d3.easeCubicIn)
        .attr("x2", m.x).attr("y2", m.y)
        .transition()
        .duration(TAIL_MS).ease(d3.easeCubicOut)
        .attr("x1", m.x).attr("y1", m.y)
        .on("end", () => { line.remove(); settle(m, true); });
    });
  }

  const play = instant => { open(instant); fill(instant); };
  play.open = open;
  play.fill = fill;
  return play;
}

// ---------- one year, opened large
//
// A layer over the page, not a scene of its own: the page stays where it was
// under it, and the wheel and the scroll keys are held while it is open so
// the scenes do not move behind it.

let lightbox = null;
let returnFocus = null;
const CLOSE_MS = 300;

function buildLightbox() {
  const box = d3.select("body").append("div")
    .attr("class", "disc-lightbox")
    .attr("role", "dialog")
    .attr("aria-modal", "true")
    .attr("aria-labelledby", "disc-lightbox-year")
    .attr("hidden", "");

  const panel = box.append("div").attr("class", "disc-lightbox__panel");
  panel.append("div").attr("class", "disc-lightbox__plot");
  const text = panel.append("div").attr("class", "disc-lightbox__text");
  text.append("h3").attr("id", "disc-lightbox-year").attr("class", "disc-lightbox__year");
  text.append("p").attr("class", "disc-lightbox__figures");
  text.append("p").attr("class", "disc-lightbox__key")
    .text("The farther a mark sits from the centre, the farther from Lampedusa it was recorded. " +
          "The larger the mark, the more people were recorded dead or missing. " +
          "Hover over a mark for details.");
  box.append("button")
    .attr("class", "disc-lightbox__close")
    .attr("type", "button")
    .attr("aria-label", "Close")
    .html("&times;")
    .on("click", closeYear);

  // A click on the backdrop closes; one on the disc or the text does not.
  box.on("click", (event) => { if (event.target === box.node()) closeYear(); });

  const node = box.node();
  node.addEventListener("wheel", e => e.preventDefault(), { passive: false });
  node.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  return box;
}

function onKey(event) {
  if (event.key === "Escape") { closeYear(); return; }
  if ([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
  }
}

// The ring labels are drawn in the disc's own units, so on a short screen,
// where the disc is drawn small, they are raised until they come out at
// MIN_TEXT_PX.
function fitRingLabels() {
  const svg = lightbox && lightbox.select(".disc-lightbox__plot svg").node();
  if (!svg || lightbox.node().hidden) return;
  const units = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
  d3.select(svg).selectAll(".year-disc__ring-label")
    .attr("font-size", Math.max(RING_LABEL_UNITS, MIN_TEXT_PX * units));
}

function openYear(year, rows, from) {
  if (!lightbox) lightbox = buildLightbox();
  returnFocus = from;
  hideTip();

  lightbox.select(".disc-lightbox__year").text(year);
  lightbox.select(".disc-lightbox__figures").html(figures(rows));
  const plot = lightbox.select(".disc-lightbox__plot").html("");
  const play = disc(plot, rows, year, LARGE_R);

  const node = lightbox.node();
  node.hidden = false;
  node.getBoundingClientRect();              // so the opening is transitioned
  fitRingLabels();
  lightbox.classed("is-open", true);
  document.addEventListener("keydown", onKey);
  lightbox.select(".disc-lightbox__close").node().focus({ preventScroll: true });
  play(REDUCED);
}

function closeYear() {
  if (!lightbox || !lightbox.classed("is-open")) return;
  hideTip();
  lightbox.classed("is-open", false);
  document.removeEventListener("keydown", onKey);
  const node = lightbox.node();
  setTimeout(() => {
    if (lightbox.classed("is-open")) return;  // opened again meanwhile
    node.hidden = true;
    lightbox.select(".disc-lightbox__plot").html("");
  }, CLOSE_MS);
  if (returnFocus) returnFocus.focus({ preventScroll: true });
}

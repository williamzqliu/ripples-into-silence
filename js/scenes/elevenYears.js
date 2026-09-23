// js/scenes/elevenYears.js
//
// Eleven years, one disc each, every disc the same fifty kilometre circle as
// the main sequence and read off the same two rules: how far out a mark sits
// is how far out the incident was, how big it is is how many people were
// lost. Put side by side that makes the years comparable at a glance, which
// a line of totals cannot do.
//
// This replaces a chart whose eleven-year series was written into the source
// by hand and matched the data in one year out of eleven.
//
// The discs are all one size, in rows of four, three and four, the middle row
// set between the others. 2024 used to be drawn large between two columns of
// small ones, which read as more incidents when 2023 holds twice as many. It
// is the same size now, and marked for what it does hold: the most lives
// lost in any year, in a solid frame with a line under its figures. Any year
// can be opened large, with its rings and a figure for every mark.

import {
  RADIUS_KM, radiusFractionFor,
  GOLDEN_ANGLE, CROSS_COLOUR,
  DISTANCE_RINGS_KM
} from "../config.js";

import { loadAndProcessData } from "../data/incidents.js";
import { reducedMotion as REDUCED } from "../core/motion.js";

// Rows, top to bottom. On an eight column grid each disc spans two, and a
// shorter row is inset by one column a disc short, which sets it between
// the discs of the row above.
const ROWS = [4, 3, 4];
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

const WORST_NOTE = "The most lives lost in any year";

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

// Each disc plays once, when its top comes above this line: the same kind
// of scroll check every other entrance on the page uses.
const PLAY_AT = 0.9;
const pending = new Set();

function checkDiscs() {
  const vh = window.innerHeight;
  for (const node of pending) {
    if (node.closest('.scene--away')) continue;   // wait for its scene
    const r = node.getBoundingClientRect();
    if (r.top < vh * PLAY_AT && r.bottom > 0) {
      pending.delete(node);
      node.__play();
    }
  }
}
export function initElevenYears() {
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

  // The year the most people were lost, found rather than written in.
  const worst = d3.greatest(years, y => d3.sum(byYear.get(y), d => d.dead));

  const grid = root.append("div").attr("class", "year-discs");

  // Row by row, in year order; any years past the eleven go on in fours.
  let i = 0, row = 0;
  while (i < years.length) {
    const count = Math.min(ROWS[row] ?? 4, years.length - i);
    const inset = (GRID_COLUMNS / 2 - count);
    for (let k = 0; k < count; k++, i++) {
      const y = years[i];
      cell(grid, y, byYear.get(y), 1 + inset + k * 2, y === worst);
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
  return `${rows.length} ${rows.length === 1 ? "incident" : "incidents"}<br />` +
    `${dead} dead or missing`;
}

function note(isWorst) {
  return isWorst ? `<div class="year-disc__note">${WORST_NOTE}</div>` : "";
}

// One year: the disc, with its year and figures under it. The whole cell
// opens the year large.
function cell(grid, year, rows, column, isWorst) {
  const box = grid.append("div")
    .attr("class", `year-disc fade-step${isWorst ? " year-disc--worst" : ""}`)
    .style("grid-column", `${column} / span 2`)
    .attr("role", "button")
    .attr("tabindex", 0)
    .attr("aria-label", `Open ${year}`);

  const holder = box.append("div").attr("class", "year-disc__plot");
  box.append("div").attr("class", "year-disc__label").html(`
    <div class="year-disc__year">${year}</div>
    <div class="year-disc__figures">${figures(rows)}</div>${note(isWorst)}`);

  const play = disc(holder, rows, year, SMALL_R);
  const node = box.node();
  if (REDUCED) play(true);
  else { node.__play = () => play(false); pending.add(node); }

  const open = () => openYear(year, rows, node, isWorst);
  box.on("click", open)
    .on("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
}

function showTip(event, d) {
  d3.select("#tooltip")
    .html(`${d.year}<br>${d.distance.toFixed(1)} km from Lampedusa` +
          `<br>${d.dead} dead or missing`)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 20}px`)
    .style("opacity", 1);
}

function hideTip() {
  d3.select("#tooltip").style("opacity", 0);
}

// One disc, drawn at radius r in its own units. The large one also carries
// the sequence's 25 and 10 kilometre rings, and a label on each.
function disc(holder, rows, year, r) {
  const big = r === LARGE_R;
  const pad = big ? 24 : 3;       // the large one's pad holds the 50 km label
  const size = (r + pad) * 2;
  const svg = holder.append("svg")
    .attr("viewBox", `0 0 ${size} ${size}`)
    .attr("role", "img")
    .attr("aria-label",
      `${year}: ${rows.length} incidents within ${RADIUS_KM} kilometres of Lampedusa, ` +
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
  // large one can still be reached. The mark under the pointer goes yellow.
  for (const m of [...marks].sort((a, b) => b.r - a.r)) {
    svg.append("circle")
      .attr("cx", m.x).attr("cy", m.y).attr("r", m.r + 4 * u)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseenter", () => m.g.classed("is-hot", true))
      .on("mousemove", (event) => showTip(event, m.d))
      .on("mouseleave", () => { m.g.classed("is-hot", false); hideTip(); });
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

  let played = false;
  return function play(instant) {
    if (played) return;
    played = true;

    if (instant) {
      frame.attr("r", r);
      cross.attr("opacity", 0.75);
      rings.forEach(g => g.attr("opacity", 1));
      ringLabels.forEach(t => t.attr("opacity", 1));
      marks.forEach(m => settle(m, false));
      return;
    }

    frame.transition().duration(OPEN_MS).ease(d3.easeCubicOut).attr("r", r);
    cross.transition().duration(OPEN_MS * 0.7).attr("opacity", 0.75);
    rings.forEach((g, k) => g.transition().delay(OPEN_MS * 0.4 + k * 150)
      .duration(OPEN_MS).attr("opacity", 1));
    ringLabels.forEach((t, k) => t.transition().delay(OPEN_MS * 0.4 + k * 150)
      .duration(OPEN_MS).attr("opacity", 1));

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
        .delay(OPEN_MS * 0.6 + i * step)
        .duration(FLY_MS).ease(d3.easeCubicIn)
        .attr("x2", m.x).attr("y2", m.y)
        .transition()
        .duration(TAIL_MS).ease(d3.easeCubicOut)
        .attr("x1", m.x).attr("y1", m.y)
        .on("end", () => { line.remove(); settle(m, true); });
    });
  };
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
  text.append("p").attr("class", "disc-lightbox__note");
  text.append("p").attr("class", "disc-lightbox__key")
    .text("How far out a mark sits is how far from Lampedusa the incident was; " +
          "its size is how many people were lost. Point at a mark for its figures.");
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

function openYear(year, rows, from, isWorst) {
  if (!lightbox) lightbox = buildLightbox();
  returnFocus = from;
  hideTip();

  lightbox.select(".disc-lightbox__year").text(year);
  lightbox.select(".disc-lightbox__figures").html(figures(rows));
  lightbox.select(".disc-lightbox__note").text(isWorst ? WORST_NOTE : "")
    .attr("hidden", isWorst ? null : "");
  lightbox.classed("disc-lightbox--worst", !!isWorst);
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

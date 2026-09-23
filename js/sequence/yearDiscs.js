// js/sequence/yearDiscs.js
//
// Eleven years, one disc each, every disc the same fifty kilometre circle as
// the main sequence and read off the same two rules: how far out a mark sits
// is how far out the incident was, how big it is is how many people were
// lost. Put side by side that makes the years comparable at a glance, which
// a line of totals cannot do.
//
// This replaces a chart whose eleven-year series was written into the source
// by hand and matched the data in one year out of eleven.

import {
  RADIUS_KM, radiusFractionFor,
  GOLDEN_ANGLE, CROSS_COLOUR,
  RIPPLE_INNER_OPACITY_STEPS
} from "../config.js";

import { loadAndProcessData } from "./dataProcessing.js";

// The disc the year with the most incidents has to stay legible in. 66 is
// the most the three columns hold at 1024 wide.
const SMALL_R = 66;
const FOCUS_R = 155;
const FOCUS_YEAR = 2024;

// The smallest mark, in px. At a small disc's scale a five-death incident
// came out a pixel and a half across.
const MIN_MARK = 1.8;

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

const REDUCED = window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Each disc plays once, when its top comes above this line: the same kind
// of scroll check every other entrance on the page uses.
const PLAY_AT = 0.9;
const pending = new Set();

function checkDiscs() {
  const vh = window.innerHeight;
  for (const node of pending) {
    const r = node.getBoundingClientRect();
    if (r.top < vh * PLAY_AT && r.bottom > 0) {
      pending.delete(node);
      node.__play();
    }
  }
}
window.addEventListener("scroll", checkDiscs, { passive: true });
window.addEventListener("resize", checkDiscs);

export async function drawYearDiscs(containerId) {
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

  const focus = years.filter(y => y === FOCUS_YEAR);
  const rest = years.filter(y => y !== FOCUS_YEAR);
  const half = Math.ceil(rest.length / 2);

  const grid = root.append("div").attr("class", "year-discs");
  const left = grid.append("div").attr("class", "year-discs__col");
  const mid = grid.append("div").attr("class", "year-discs__focus");
  const right = grid.append("div").attr("class", "year-discs__col");

  // The figures sit on the outside of each column, as the storyboard has them.
  rest.slice(0, half).forEach(y => cell(left, y, byYear.get(y), SMALL_R, "left"));
  focus.forEach(y => cell(mid, y, byYear.get(y), FOCUS_R, "below"));
  rest.slice(half).forEach(y => cell(right, y, byYear.get(y), SMALL_R, "right"));

  // The cells carry .fade-step, which main.js reveals on scroll, and the
  // discs play on scroll. Both checks may already have run before these
  // existed.
  window.dispatchEvent(new Event("scroll"));
}

// One year: the figures beside the disc, or under it for the focus year.
function cell(parent, year, rows, r, labelSide) {
  const dead = d3.sum(rows, d => d.dead);
  const box = parent.append("div")
    .attr("class", `year-disc year-disc--${labelSide} fade-step`);

  const text = `
    <div class="year-disc__year">${year}</div>
    <div class="year-disc__figures">
      ${rows.length} ${rows.length === 1 ? "incident" : "incidents"}<br />
      ${dead} dead or missing
    </div>`;

  if (labelSide === "left") box.append("div").attr("class", "year-disc__label").html(text);
  const holder = box.append("div").attr("class", "year-disc__plot");
  if (labelSide !== "left") box.append("div").attr("class", "year-disc__label").html(text);

  const play = disc(holder, rows, r, year);
  const node = box.node();
  if (REDUCED) play(true);
  else { node.__play = () => play(false); pending.add(node); }
}

function ringOpacity(dead) {
  return RIPPLE_INNER_OPACITY_STEPS.find(s => dead <= s.upTo).opacity;
}

function disc(holder, rows, r, year) {
  const pad = 2;
  const size = (r + pad) * 2;
  const svg = holder.append("svg")
    .attr("width", size).attr("height", size)
    .attr("viewBox", `0 0 ${size} ${size}`)
    .attr("role", "img")
    .attr("aria-label",
      `${year}: ${rows.length} incidents within ${RADIUS_KM} kilometres of Lampedusa, ` +
      `${d3.sum(rows, d => d.dead)} people dead or missing.`);

  const c = size / 2;
  const scale = r / 300;          // the main sequence draws this at 300px
  const big = r > 100;

  // The fifty kilometre frame, the same dashed circle as the sequence.
  // Starts closed: it opens out of the cross when the disc plays.
  const frame = svg.append("circle")
    .attr("cx", c).attr("cy", c).attr("r", 0)
    .attr("fill", "none")
    .attr("stroke", "rgba(255,255,255,0.18)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", big ? "6 6" : "3 4");

  // Each mark used to be a white dot at the end of a faint line held from
  // the rim, "the path it came in on", which at this size read as a shoal of
  // tadpoles swimming for the middle. The line only appears in flight now,
  // as it does in the sequence, and what stays is the sequence's own mark:
  // a solid core and the ring it leaves, as bright as the loss is large.
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
        g: svg.append("g"),
      };
    });

  for (const m of marks) {
    svg.append("circle")
      .attr("cx", m.x).attr("cy", m.y).attr("r", m.r * 1.9 + 3)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .html(`${m.d.year}<br>${m.d.distance.toFixed(1)} km from Lampedusa` +
                `<br>${m.d.dead} dead or missing`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`)
          .style("opacity", 1);
      })
      .on("mouseleave", () => d3.select("#tooltip").style("opacity", 0));
  }

  // Lampedusa, the same cross the sequence marks it with.
  const arm = big ? 5 : 3;
  const cross = svg.append("g").attr("opacity", 0);
  cross.append("line").attr("x1", c - arm).attr("y1", c).attr("x2", c + arm).attr("y2", c)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5);
  cross.append("line").attr("x1", c).attr("y1", c - arm).attr("x2", c).attr("y2", c + arm)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5);

  // The mark as it stays: the core, and the ring around it.
  function settle(m, animate) {
    const core = m.g.append("circle")
      .attr("cx", m.x).attr("cy", m.y)
      .attr("r", animate ? 0 : m.r)
      .attr("fill", "#FFFFFF").attr("fill-opacity", 0.9);
    const ring = m.g.append("circle")
      .attr("cx", m.x).attr("cy", m.y)
      .attr("r", animate ? m.r : m.r * 1.9)
      .attr("fill", "none")
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", big ? 1 : 0.75)
      .attr("stroke-opacity", animate ? 0 : ringOpacity(m.d.dead));
    if (!animate) return;

    core.transition().duration(220).ease(d3.easeCubicOut).attr("r", m.r);
    ring.transition().duration(500).ease(d3.easeCubicOut)
      .attr("r", m.r * 1.9).attr("stroke-opacity", ringOpacity(m.d.dead));
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
      marks.forEach(m => settle(m, false));
      return;
    }

    frame.transition().duration(OPEN_MS).ease(d3.easeCubicOut).attr("r", r);
    cross.transition().duration(OPEN_MS * 0.7).attr("opacity", 0.75);

    // In the order they happened, which is the order the rows are in.
    const byDate = marks.slice().sort((a, b) => rows.indexOf(a.d) - rows.indexOf(b.d));
    const step = Math.min(STEP_MAX_MS, RUN_MS / Math.max(1, byDate.length));
    byDate.forEach((m, i) => {
      const line = m.g.append("line")
        .attr("x1", m.rimX).attr("y1", m.rimY)
        .attr("x2", m.rimX).attr("y2", m.rimY)
        .attr("stroke", "rgba(255,255,255,0.55)")
        .attr("stroke-width", big ? 1.2 : 0.8)
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

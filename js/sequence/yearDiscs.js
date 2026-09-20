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
  SCALE_DEAD_MIN, SCALE_DEAD_MAX,
  GOLDEN_ANGLE, CROSS_COLOUR, LABEL_FONT
} from "../config.js";

import { loadAndProcessData } from "./dataProcessing.js";

// The disc the year with the most incidents has to stay legible in.
const SMALL_R = 62;
const FOCUS_R = 155;
const FOCUS_YEAR = 2024;

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
}

// One year: the figures beside the disc, or under it for the focus year.
function cell(parent, year, rows, r, labelSide) {
  const dead = d3.sum(rows, d => d.dead);
  const box = parent.append("div")
    .attr("class", `year-disc year-disc--${labelSide}`);

  const text = `
    <div class="year-disc__year">${year}</div>
    <div class="year-disc__figures">
      ${rows.length} ${rows.length === 1 ? "incident" : "incidents"}<br />
      ${dead} dead or missing
    </div>`;

  if (labelSide === "left") box.append("div").attr("class", "year-disc__label").html(text);
  const holder = box.append("div").attr("class", "year-disc__plot");
  if (labelSide !== "left") box.append("div").attr("class", "year-disc__label").html(text);

  disc(holder, rows, r, year);
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

  // the fifty kilometre frame, the same dashed circle as the sequence
  svg.append("circle")
    .attr("cx", c).attr("cy", c).attr("r", r)
    .attr("fill", "none")
    .attr("stroke", "rgba(255,255,255,0.18)")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", r > 100 ? "6 6" : "3 4");

  // Drawn furthest first, so the marks nearest the island sit on top.
  const sorted = [...rows].sort((a, b) => b.disappearRatio - a.disappearRatio);

  for (const d of sorted) {
    const q = radiusFractionFor(d.distance);
    const x = c + Math.cos(d.discAngle) * r * q;
    const y = c + Math.sin(d.discAngle) * r * q;

    // the path it came in on, held faint
    svg.append("line")
      .attr("x1", c + Math.cos(d.discAngle) * r)
      .attr("y1", c + Math.sin(d.discAngle) * r)
      .attr("x2", x).attr("y2", y)
      .attr("stroke", "rgba(255,255,255,0.16)")
      .attr("stroke-width", r > 100 ? 1 : 0.6);

    const markR = Math.max(1.5, d.radius * scale);
    svg.append("circle")
      .attr("cx", x).attr("cy", y).attr("r", markR)
      .attr("fill", "#FFFFFF")
      .attr("fill-opacity", 0.92);

    svg.append("circle")
      .attr("cx", x).attr("cy", y).attr("r", markR + 6 * scale + 3)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousemove", (event) => {
        d3.select("#tooltip")
          .html(`${d.year}<br>${d.distance.toFixed(1)} km from Lampedusa` +
                `<br>${d.dead} dead or missing`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`)
          .style("opacity", 1);
      })
      .on("mouseleave", () => d3.select("#tooltip").style("opacity", 0));
  }

  // Lampedusa, the same cross the sequence marks it with
  const arm = r > 100 ? 5 : 3;
  const cross = svg.append("g").attr("opacity", 0.75);
  cross.append("line").attr("x1", c - arm).attr("y1", c).attr("x2", c + arm).attr("y2", c)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5);
  cross.append("line").attr("x1", c).attr("y1", c - arm).attr("x2", c).attr("y2", c + arm)
    .attr("stroke", CROSS_COLOUR).attr("stroke-width", 1.5);

  svg.selectAll("text").style("font-family", LABEL_FONT);
}

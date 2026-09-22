// js/sequence/drawCircle.js

import {
  cx, cy,
  LAUNCH_RADIUS, RADIUS_KM,
  RANGE_CIRCLE_STROKE,
  DISTANCE_RINGS_KM, radiusFractionFor, LABEL_FONT
} from "../config.js";

// Resolves when the fade-in is over, so the opening can be sequenced.
function drawCircle(delay = 0) {
  return new Promise(resolve => {
    d3.select("#viz").select("svg")
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", LAUNCH_RADIUS)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", RANGE_CIRCLE_STROKE)
      .attr("stroke-dasharray", "8 8")
      .attr("opacity", 0)
      .transition()
      .delay(delay)
      .duration(1200)
      .ease(d3.easeCubicInOut)
      .attr("opacity", 1)
      .on("end", () => {
        drawDistanceRings(delay);
        resolve();
      });
  });
}

// Most of these incidents happened close in: the median is fourteen
// kilometres of the fifty. Without a ruler the empty outer water reads as
// space nothing was plotted in, rather than as the finding it is.
function drawDistanceRings(delay) {
  const svg = d3.select("#viz").select("svg");

  // The outer circle carries the reading the radius line gives once and then
  // takes away with it, so a reader who arrives after the opening still has
  // a scale to read the marks against.
  ringLabel(svg, LAUNCH_RADIUS, RADIUS_KM, delay);

  DISTANCE_RINGS_KM.forEach((km, i) => {
    const r = LAUNCH_RADIUS * radiusFractionFor(km);

    svg.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.10)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 7")
      .attr("opacity", 0)
      .lower()
      .transition()
      .delay(delay + i * 200)
      .duration(900)
      .attr("opacity", 1);

    ringLabel(svg, r, km, delay + (i + 1) * 200);
  });
}

// These sat at 10px and 28% white, directly on the dashes, which made them
// guesswork. Bigger, brighter, clear of the stroke, and painted over a
// hairline of the page colour so no dash runs through a letter.
function ringLabel(svg, r, km, delay) {
  svg.append("text")
    .attr("x", cx)
    .attr("y", cy - r - 9)
    .attr("text-anchor", "middle")
    .attr("fill", "rgba(255,255,255,0.5)")
    .attr("stroke", "#0F1A32")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .attr("font-size", 14)
    .style("font-family", LABEL_FONT)
    .style("font-variant-numeric", "tabular-nums lining-nums")
    .attr("opacity", 0)
    .text(`${km} km`)
    .lower()
    .transition()
    .delay(delay)
    .duration(900)
    .attr("opacity", 1);
}

export { drawCircle };

// js/scenes/record/drawCircle.js

import {
  cx, cy,
  LAUNCH_RADIUS, RADIUS_KM,
  RANGE_CIRCLE_STROKE,
  DISTANCE_RINGS_KM, DISTANCE_RING_STROKE, RING_LABEL_GAP,
  CIRCLE_OPEN, RING_STAGGER,
  radiusFractionFor, LABEL_FONT
} from "../../config.js";

import { unit, halfBox, pushOut } from "./labelGeometry.js";

// Resolves when the fade-in is over, so the opening can be sequenced.
function drawCircle(delay = 0) {
  return new Promise(resolve => {
    d3.select("#viz").select("svg")
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      /* Opened out of the cross rather than faded in at full size. The
         piece is about ripples; the fifty kilometres is the first one. */
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", RANGE_CIRCLE_STROKE)
      .attr("stroke-dasharray", "8 8")
      .attr("opacity", 0)
      .transition()
      .delay(delay)
      .duration(CIRCLE_OPEN)
      .ease(d3.easeCubicOut)
      .attr("r", LAUNCH_RADIUS)
      .attr("opacity", 1)
      .on("end", () => {
        drawDistanceRings();
        resolve();
      });
  });
}

// Most of these incidents happened close in: the median is fourteen
// kilometres of the fifty. Without a ruler the empty outer water reads as
// space nothing was plotted in, rather than as the finding it is.
function drawDistanceRings() {
  const svg = d3.select("#viz").select("svg");

  // The outer circle carries the reading the radius line gives once and then
  // takes away with it, so a reader who arrives after the opening still has
  // a scale to read the marks against.
  ringLabel(svg, LAUNCH_RADIUS, RADIUS_KM, 0);

  DISTANCE_RINGS_KM.forEach((km, i) => {
    const r = LAUNCH_RADIUS * radiusFractionFor(km);

    svg.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r)
      .attr("fill", "none")
      /* 0.10 at a 3-on-7-off dash is almost no ink: the outer circle is
         0.18 at 2px and reads, these did not. */
      .attr("stroke", "rgba(255,255,255,0.20)")
      .attr("stroke-width", DISTANCE_RING_STROKE)
      .attr("stroke-dasharray", "4 6")
      .attr("opacity", 0)
      .lower()
      .transition()
      .delay(i * RING_STAGGER)
      .duration(900)
      .attr("opacity", 1);

    ringLabel(svg, r, km, (i + 1) * RING_STAGGER);
  });
}

// These sat at 10px and 28% white, directly on the dashes, which made them
// guesswork. Bigger, brighter, clear of the stroke, and painted over a
// hairline of the page colour so no dash runs through a letter.
//
// They stay at the top of their own rings. Walking them round to somewhere
// no mark ever lands was tried and thrown away: twenty-three of the
// ninety-four incidents land within thirty pixels of the ten kilometre
// ring, which is the densest water in the figure, and there is no angle on
// it that stays clear. Rotating the whole ruler off the vertical saves two
// touches out of three and costs the alignment that makes the three numbers
// read as one scale. So the marks draw over the labels where they meet: the
// marks are the record, these are the ruler beside it.
function ringLabel(svg, r, km, delay) {
  const text = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "rgba(255,255,255,0.5)")
    .attr("stroke", "#0F1A32")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .style("font-size", "max(14px, var(--min-text, 0px))")
    .style("font-family", LABEL_FONT)
    .style("font-variant-numeric", "tabular-nums lining-nums")
    .attr("opacity", 0)
    .text(`${km} km`);

  // Just outside its own ring, measured from the text's own box rather
  // than by a fixed nine pixels, so the daylight survives a change of size.
  const spot = pushOut({ x: cx, y: cy }, unit(-Math.PI / 2), r,
    halfBox(text.node()), RING_LABEL_GAP);

  text
    .attr("x", spot.x)
    .attr("y", spot.y)
    .lower()
    .transition()
    .delay(delay)
    .duration(900)
    .attr("opacity", 1);
}

export { drawCircle };

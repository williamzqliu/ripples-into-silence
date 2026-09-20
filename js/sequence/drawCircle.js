// js/sequence/drawCircle.js

import {
  cx, cy,
  LAUNCH_RADIUS,
  RANGE_CIRCLE_STROKE
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
        resolve();
      });
  });
}

export { drawCircle };

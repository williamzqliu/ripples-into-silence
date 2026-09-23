// js/sequence/drawCross.js

import {
  cx, cy,
  CROSS_LINE_LENGTH,
  CROSS_LINE_OPACITY,
  CROSS_LINE_STROKE,
  CROSS_COLOUR
} from "../config.js";

// The cross at the centre is Lampedusa. It grows as the island outline
// comes down onto it: same centre, same duration, so the two read as one
// movement. It used to wait five hundred milliseconds and take a second,
// by which time the island had already been taken off the screen.
function drawCross(duration = 900) {
  const svg = d3.select("#viz").select("svg");

  const crossGroup = svg.append("g")
    .attr("id", "yellow-cross")
    .attr("transform", `translate(${cx}, ${cy}) scale(0)`) // scaled to nothing to begin with
    .attr("opacity", 0);

  // horizontal
  crossGroup.append("line")
    .attr("x1", -CROSS_LINE_LENGTH)
    .attr("y1", 0)
    .attr("x2", CROSS_LINE_LENGTH)
    .attr("y2", 0)
    .attr("stroke", CROSS_COLOUR)
    .attr("stroke-width", CROSS_LINE_STROKE);

  // vertical
  crossGroup.append("line")
    .attr("x1", 0)
    .attr("y1", -CROSS_LINE_LENGTH)
    .attr("x2", 0)
    .attr("y2", CROSS_LINE_LENGTH)
    .attr("stroke", CROSS_COLOUR)
    .attr("stroke-width", CROSS_LINE_STROKE);

  // grow into place
  crossGroup.transition()
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr("transform", `translate(${cx}, ${cy}) scale(1)`)
    .attr("opacity", CROSS_LINE_OPACITY);

  // A transparent circle, because a five pixel cross is not a hover target.
  const tooltip = d3.select("#tooltip");

  crossGroup.append("circle")
    .attr("r", CROSS_LINE_LENGTH + 10)
    .attr("fill", "transparent")
    .style("cursor", "pointer")
    .on("mousemove", (event) => {
      tooltip
        .html("Lampedusa")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`)
        .style("opacity", 1);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });
}

export { drawCross };

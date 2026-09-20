// js/sequence/drawCross.js

import {
  cx, cy,
  CROSS_LINE_LENGTH,
  CROSS_LINE_OPACITY,
  CROSS_LINE_STROKE,
  CROSS_COLOUR
} from "../config.js";

// The cross at the centre is Lampedusa. It scales up from nothing once the
// island outline has shrunk down to it.
function drawCross() {
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
    .delay(500)
    .duration(1000)
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

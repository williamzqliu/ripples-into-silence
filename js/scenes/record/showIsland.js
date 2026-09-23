// js/scenes/record/showIsland.js
//
// The island outline, its name, and the shrink that lands it on the cross
// the rest of the diagram is measured from.
//
// This used to play on #lampedusa-intro, a fixed full-screen layer floating
// over the whole page, and two things went wrong with that. The layer is
// centred on the viewport while the cross is centred on the drawing frame,
// which is a different point on the screen, so the island shrank in one
// place and the cross appeared in another. And the shrink never got to
// play at all: the class and display:none landed in the same frame, so the
// second of island-becoming-cross was thrown away and the island simply
// vanished, while the name's fade-out fired a second and a half later
// inside an element nobody could see any more.
//
// It is drawn inside the frame now, on the same canvas as everything else,
// so the shrink ends exactly where the cross begins and the fifty kilometre
// circle opens out of the same point.

import {
  cx, cy,
  ISLAND_WIDTH, ISLAND_FADE_IN, ISLAND_HOLD,
  NAME_FADE_OUT, NAME_OFFSET, ISLAND_SHRINK
} from "../../config.js";

import { drawCross } from "./drawCross.js";

// The outline is authored in a 149 by 51 viewBox, so it has to be scaled to
// the frame and re-centred on its own middle rather than on its corner.
const ART_W = 149;
const ART_H = 51;

function islandTransform(scale) {
  const s = (ISLAND_WIDTH / ART_W) * scale;
  return `translate(${cx}, ${cy}) scale(${s}) translate(${-ART_W / 2}, ${-ART_H / 2})`;
}

export function showIsland() {
  const svg = d3.select("#viz").select("svg");
  const asset = document.querySelector("#island-asset path");
  if (!asset) return Promise.resolve();

  const group = svg.append("g").attr("id", "island-intro");

  const island = group.append(() => asset.cloneNode(true))
    .attr("transform", islandTransform(1))
    .attr("opacity", 0);

  const name = group.append("text")
    .attr("x", cx)
    .attr("y", cy + NAME_OFFSET)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "#ffffff")
    .attr("font-size", 32)
    .style("font-family", "'Bebas Neue', sans-serif")
    .style("letter-spacing", "1.5px")
    .attr("opacity", 0)
    .text("LAMPEDUSA");

  return new Promise(resolve => {
    island.transition().duration(ISLAND_FADE_IN).attr("opacity", 1);
    name.transition().duration(ISLAND_FADE_IN).attr("opacity", 1);

    // The name goes first, so the shrink has the frame to itself.
    name.transition()
      .delay(ISLAND_FADE_IN + ISLAND_HOLD)
      .duration(NAME_FADE_OUT)
      .attr("opacity", 0)
      .remove();

    // The cross grows as the island comes down onto it, in step and in the
    // same place, so one becomes the other rather than replacing it.
    island.transition()
      .delay(ISLAND_FADE_IN + ISLAND_HOLD + NAME_FADE_OUT)
      .duration(ISLAND_SHRINK)
      .ease(d3.easeCubicInOut)
      .attr("transform", islandTransform(0.02))
      .attr("opacity", 0)
      .on("start", () => drawCross(ISLAND_SHRINK))
      .on("end", () => {
        group.remove();
        resolve();
      });
  });
}

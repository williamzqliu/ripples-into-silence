// js/sequence/drawCanvas.js

import { FRAME_WIDTH, FRAME_HEIGHT } from "../config.js";

// Declared up here so the other modules can import them once drawCanvas has
// run and filled them in.
let intro_svg, intro_defs, intro_layer;

// Create the main SVG canvas and its two layers.
function drawCanvas() {
    intro_svg = d3.select("#viz")
        .append("svg")
        .attr("width", FRAME_WIDTH)
        .attr("height", FRAME_HEIGHT)
        .style("background", "transparent");

    intro_defs = intro_svg.append("defs"); // gradients live here
    intro_layer = intro_svg.append("g");   // everything drawn goes here

}

export { drawCanvas, intro_svg, intro_defs, intro_layer };
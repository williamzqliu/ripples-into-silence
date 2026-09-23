// js/scenes/record/drawCanvas.js

import { FRAME_WIDTH, FRAME_HEIGHT, MIN_TEXT_PX } from "../../config.js";

// Declared up here so the other modules can import them once drawCanvas has
// run and filled them in.
let intro_svg, intro_defs, intro_layer;

// Create the main SVG canvas and its two layers.
function drawCanvas() {
    // Everything is drawn in a 650 unit square. It used to be displayed at
    // exactly 650px too, which only fits a window about 874px tall: at
    // 1280x720 the circle ran 33px into the year labels, and at 1200x600
    // it sat under the nav and lost 40px off the bottom. The viewBox keeps
    // the drawing in its own units and fitCanvas sizes it to the room there
    // is, up to the 650 it was designed at, so large screens are unchanged.
    intro_svg = d3.select("#viz")
        .append("svg")
        .attr("viewBox", `0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`)
        .style("background", "transparent");

    intro_defs = intro_svg.append("defs"); // gradients live here
    intro_layer = intro_svg.append("g");   // everything drawn goes here

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
}

function fitCanvas() {
    const host = document.getElementById("viz");
    const svg = intro_svg && intro_svg.node();
    if (!host || !svg) return;

    const cs = getComputedStyle(host);
    const w = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const size = Math.max(0, Math.floor(Math.min(w, h, FRAME_WIDTH)));

    svg.setAttribute("width", size);
    svg.setAttribute("height", size);

    // Labels are sized in drawing units, so they shrink with the drawing.
    // This is the size in drawing units that comes out at MIN_TEXT_PX on
    // screen; the labels take whichever is larger.
    if (size > 0) {
        svg.style.setProperty("--min-text", `${(MIN_TEXT_PX * FRAME_WIDTH / size).toFixed(2)}px`);
    }
}

export { drawCanvas, intro_defs, intro_layer };

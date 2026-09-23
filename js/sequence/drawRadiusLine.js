// js/sequence/drawRadiusLine.js

import { cx, cy, LAUNCH_RADIUS, RADIUS_KM, LABEL_FONT } from "../config.js";

export function drawRadiusLine() {
    const svg = d3.select("#viz").select("svg");

    // Starts at the midpoint of the right-hand radius and opens outwards
    // from there, so it reads as a measurement rather than as a pointer.
    const centerX = cx + LAUNCH_RADIUS / 2;
    const centerY = cy;

    // the line, at no length and invisible
    const line = svg.append("line")
        .attr("x1", centerX)
        .attr("y1", centerY)
        .attr("x2", centerX)
        .attr("y2", centerY)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0)
        .lower();

    // the reading, also invisible
    const label = svg.append("text")
        .attr("x", centerX)
        .attr("y", centerY - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "max(14px, var(--min-text, 0px))")
        .style("font-family", LABEL_FONT)
        .style("font-variant-numeric", "tabular-nums lining-nums")
        .attr("opacity", 0)
        .text("0 km")
        .lower();

    // both fade in together
    line.transition()
        .duration(400)
        .attr("opacity", 0.85);

    label.transition()
        .duration(400)
        .attr("opacity", 0.85);

    // then the line opens from the middle, counting up as it goes
    const duration = 1600;
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const halfLength = (LAUNCH_RADIUS / 2) * t;

        line
            .attr("x1", centerX - halfLength)
            .attr("x2", centerX + halfLength);

        const km = Math.round(RADIUS_KM * t);
        label.text(`${km} km`);

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            label.text(`${RADIUS_KM} km`);

            // hold the finished reading, then let it go
            setTimeout(() => {
                line.transition()
                    .duration(1000)
                    .attr("opacity", 0)
                    .remove();

                label.transition()
                    .duration(1000)
                    .attr("opacity", 0)
                    .remove();
            }, 1500);
        }
    }

    requestAnimationFrame(animate);
}

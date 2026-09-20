// js/sequence/showIsland.js

import { drawCross } from "./drawCross.js";

export function showIslandSVG() {
    return new Promise(resolve => {
        const islandWrapper = d3.select("#lampedusa-intro .island-wrapper");

        // straight in, no fade
        islandWrapper.classed("show", true);

        // then it shrinks to the cross that marks the island
        setTimeout(() => {
            islandWrapper.classed("shrink", true);

            // which is drawn once the shrink is done
            setTimeout(() => {
                drawCross();
                resolve();
            }, 0);
        }, 2000);
    });
}

// The island name: up immediately, held, then gone.
export function showIslandLabel() {
    return new Promise(resolve => {
        const label = d3.select(".lampedusa-label");

        // the class carries the fade
        label.classed("show", true);

        // hold, then fade
        setTimeout(() => {
            label.classed("show", false);
        }, 3500);

        // resolves before the fade finishes, so the next step can overlap
        setTimeout(() => {
            resolve();
        }, 1500);
    });
}

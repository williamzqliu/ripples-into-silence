// js/sequence/controller.js

import { drawCanvas } from "./drawCanvas.js";
import { drawCircle } from "./drawCircle.js";
import { drawRadiusLine } from "./drawRadiusLine.js";
import { fadeInUI } from "./fadeUI.js";
import { drawPaths } from "./drawPaths.js";
import { loadAndProcessData } from "./dataProcessing.js";
import {
    initYearProgressBar,
    updateProgress,
    startLinearProgressBar
} from "./yearProgressBar.js";

import { showIslandSVG, showIslandLabel } from "./showIsland.js";

export async function runSceneIntro() {
    // 1. the canvas everything is drawn on
    drawCanvas();

    // The record, read before anything is drawn rather than awaited between
    // the counters fading in and the first path, which put a network wait in
    // the middle of the choreography.
    const {
        allYears,
        yearEventCounts,
        firstBatch,
        remainingBuckets
    } = await loadAndProcessData();

    // 2. the island outline and its name, started together
    const svgPromise = showIslandSVG();     // island, shrink, cross
    const labelPromise = showIslandLabel(); // the name, in and out

    // 3. wait for both
    await Promise.all([svgPromise, labelPromise]);

    // The opening overlay is fixed, full-screen and was pinned above
    // everything else on the page. It used to stay there for the rest of the
    // scroll, so the island and its label showed through every section below.
    d3.select("#lampedusa-intro").style("display", "none");

    // 4. the fifty kilometre circle
    await drawCircle(2000); // 2s delay plus a 1.2s fade

    // 5. the radius, which says what the circle is
    await new Promise(res => setTimeout(res, 0));
    drawRadiusLine();

    // 6. let it finish: 1.6s to open, 1.5s held, 1s to fade
    await new Promise(res => setTimeout(res, 3600));

    // 7. the counters and the year bar
    await fadeInUI();

    // 8. and then the incidents themselves
    initYearProgressBar(allYears);
    startLinearProgressBar();

    setTimeout(() => {
        updateProgress(0);
    }, 2000);

    drawPaths({
        allYears,
        yearEventCounts,
        firstBatch,
        remainingBuckets
    });
}
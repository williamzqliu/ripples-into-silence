// js/sequence/controller.js
//
// The opening, in order. Every step waits on whenOnScene first: if the
// reader has scrolled away the sequence holds there and picks up when they
// come back, so leaving is free and nothing plays to an empty room. This
// replaced a three and a half second scroll lock, which jolted the reader
// at the one moment the page is asking to be looked at, and which did not
// solve the problem anyway: the first incident is about fifteen seconds in,
// so the lock let go long before there was anything to see.

import { drawCanvas } from "./drawCanvas.js";
import { drawCircle } from "./drawCircle.js";
import { drawRadiusLine } from "./drawRadiusLine.js";
import { fadeInUI } from "./fadeUI.js";
import { drawPaths } from "./drawPaths.js";
import { loadAndProcessData } from "./dataProcessing.js";
import { whenOnScene, wait } from "./onScene.js";
import { RADIUS_HOLD } from "../config.js";
import {
    initYearProgressBar,
    startLinearProgressBar
} from "./yearProgressBar.js";

import { showIsland } from "./showIsland.js";

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

    // 2. the island, its name, and the shrink that lands it on the cross.
    //    Drawn in the frame, so it ends where the circle is about to begin.
    await whenOnScene();
    await showIsland();

    // 3. the fifty kilometre circle, opening out of that cross, and the
    //    rings inside it
    await whenOnScene();
    await drawCircle();

    // 4. the radius, which says what the circle is
    await whenOnScene();
    drawRadiusLine();
    await wait(RADIUS_HOLD);

    // 5. the counters and the year bar
    await whenOnScene();
    await fadeInUI();

    // 6. and then the incidents themselves
    await whenOnScene();
    initYearProgressBar(allYears);
    startLinearProgressBar();

    drawPaths({
        allYears,
        yearEventCounts,
        firstBatch,
        remainingBuckets
    });
}

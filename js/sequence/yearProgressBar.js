// js/sequence/yearProgressBar.js

import { isOnScene } from "./onScene.js";

let allYears = [];
let yearMap = [];
let totalDuration = 60000;

// Each year sits at a hand-set fraction of the bar rather than an even
// division, because the years hold very different numbers of incidents.
const yearLabelPositions = {
    2014: 0.05,
    2015: 0.148,
    2016: 0.245,
    2017: 0.385,
    2018: 0.42,
    2019: 0.444,
    2020: 0.468,
    2021: 0.493,
    2022: 0.528,
    2023: 0.625,
    2024: 0.895
};

// The smallest space allowed between two labels, in pixels, and a ceiling on
// how many times the row is relaxed to get there.
const LABEL_GAP = 12;
const RELAX_PASSES = 60;

// ----- year labels
export function initYearProgressBar(years) {
    allYears = years;
    const container = d3.select("#year-pop-labels");
    container.html("");
    yearMap = [];

    allYears.forEach((year) => {
        const proportion = yearLabelPositions[year];
        if (proportion == null) return; // no position set, so nothing to draw

        const label = container.append("div")
            .attr("class", "year-pop hidden") // hidden until its year comes round
            .attr("id", `pop-${year}`)
            .style("top", "-34px")
            .text(year);

        // only record labels that were actually created
        if (label.node()) {
            yearMap.push({ year, label, proportion, shown: false });
        }
    });

    layoutYearLabels();
    // Bebas arrives over the network, and a label measured in the fallback
    // face is the wrong width to lay out against.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(layoutYearLabels);
    }
    window.addEventListener("resize", layoutYearLabels);
}

// 2017 through 2022 hold one or two incidents each, so at a bar that fills
// in real time those six labels land within about twenty-five pixels of one
// another and run together into a grey smear.
//
// The bar is a clock rather than an axis. A label has to light up while its
// year is on screen; it does not have to sit on a measured coordinate, and
// no reading is taken off it. So a run that is too tight is pushed apart,
// half a deficit to each side, until every label has room. The order is
// preserved, each label stays as close to its own moment as legibility
// allows, and the years that do carry weight - 2023 and 2024 hold nearly
// half the record between them - keep the long spans that say so.
function layoutYearLabels() {
    const track = document.getElementById("year-pop-labels");
    if (!track || !yearMap.length) return;

    const width = track.clientWidth;
    if (!width) return;

    const items = yearMap.map(d => ({
        x: d.proportion * width,
        half: d.label.node().offsetWidth / 2,
        label: d.label,
    }));

    for (let pass = 0; pass < RELAX_PASSES; pass++) {
        let moved = false;

        for (let i = 0; i < items.length - 1; i++) {
            const a = items[i];
            const b = items[i + 1];
            const deficit = (a.half + b.half + LABEL_GAP) - (b.x - a.x);
            if (deficit <= 0.5) continue;
            a.x -= deficit / 2;
            b.x += deficit / 2;
            moved = true;
        }

        // Pushing apart can walk the ends off the bar. Pinning them here and
        // running the sweep again feeds the correction back into the row.
        const first = items[0];
        const last = items[items.length - 1];
        first.x = Math.max(first.half, first.x);
        last.x = Math.min(width - last.half, last.x);

        if (!moved) break;
    }

    items.forEach(d => d.label.style("left", `${Math.round(d.x)}px`));
}

// ----- the bar itself, filling at a constant rate
export function startLinearProgressBar(duration = totalDuration) {
    totalDuration = duration;
    const bar = d3.select("#year-progress-fill").node();

    // The bar is read against the paths, and the paths stop going out when
    // the section is off screen, so the bar has to stop with them. On wall
    // clock time it filled while the record stood still and a reader coming
    // back found 2024 under a bar that said 2019.
    let elapsed = 0;
    let lastFrame = null;

    function animate(now) {
        const step = lastFrame === null ? 0 : now - lastFrame;
        lastFrame = now;
        if (isOnScene()) elapsed += step;

        const progress = Math.min(elapsed / totalDuration, 1);
        bar.style.transform = `scaleX(${progress})`;
        // Asked for early by the handover, so the number is lit at the
        // moment the fill reaches it rather than 300ms (about 6px) after.
        lightYearUnderFill(Math.min(progress + HANDOVER_MS / totalDuration, 1));

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // once the bar is full, fade the last year out too
            const activeLabel = d3.select(".year-pop.active");
            if (!activeLabel.empty()) {
                activeLabel.classed("active", false).classed("inactive", true);
            }
            setTimeout(() => {
                // hand it over to the fading class
                d3.select("#year-progress-fill").classed("fade-out", true);
              }, 1000); // a second after the bar finishes
              
        }
    }

    requestAnimationFrame(animate);
}

// ----- which year is lit
//
// A year lights up when the fill reaches its number. It used to light up
// when that year's share of incidents had been launched, plus a delay, plus
// a per-year table of millisecond corrections whose only job was to make
// the label turn over when the bar got to it. Any change to the timing
// elsewhere broke the table: cutting the wait before the first path by 1.8
// seconds and spreading the crowded labels apart put every year 13 to 53
// pixels ahead of the bar. Read off the fill, the two cannot disagree, and
// they pause together because the fill is what pauses.
//
// Nothing is lost by it. The count it used was launches, not years: the
// release is a round robin over directions, so a year's label never meant
// that year's incidents were the ones on screen.
let litIndex = -1;

// The outgoing year fades before the next one comes up.
const HANDOVER_MS = 300;

function lightYearUnderFill(progress) {
    if (!yearMap.length) return;
    const track = document.getElementById("year-pop-labels");
    const fillX = progress * (track ? track.clientWidth : 0);

    let index = -1;
    yearMap.forEach((d, i) => {
        const x = parseFloat(d.label.style("left")) || 0;
        if (fillX >= x) index = i;
    });

    if (index !== litIndex && index >= 0) {
        litIndex = index;
        updateProgress(index);
    }
}

// ----- highlighting the year on screen
export function updateProgress(currentYearIndex) {
    if (!yearMap.length) return;

    // walk the labels and move each to its new state
    yearMap.forEach((d, i) => {
        if (i < currentYearIndex) {
            d.label.classed("hidden", false).classed("inactive", true).classed("active", false);
        } else if (i > currentYearIndex) {
            d.label.classed("hidden", true).classed("inactive", false).classed("active", false);
        }
    });

    // wait for the outgoing year to fade before bringing the next one up
    setTimeout(() => {
        const d = yearMap[currentYearIndex];
        if (d) {
            d.label.classed("hidden", false).classed("inactive", false).classed("active", true);
        }
    }, HANDOVER_MS);
}

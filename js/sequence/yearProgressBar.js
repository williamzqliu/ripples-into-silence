// js/sequence/yearProgressBar.js

let allYears = [];
let yearMap = [];
let progressStartTime = null;
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
            .style("left", `${proportion * 100}%`)
            .style("top", "-34px")
            .text(year);

        // only record labels that were actually created
        if (label.node()) {
            yearMap.push({ year, label, shown: false });
        }
    });
}

// ----- the bar itself, filling at a constant rate
export function startLinearProgressBar(duration = totalDuration) {
    totalDuration = duration;
    const bar = d3.select("#year-progress-fill").node();
    progressStartTime = performance.now();

    function animate(now) {
        const elapsed = now - progressStartTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        bar.style.width = `${progress * 100}%`;

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
    const transitionDelay = 300;
    setTimeout(() => {
        const d = yearMap[currentYearIndex];
        if (d) {
            d.label.classed("hidden", false).classed("inactive", false).classed("active", true);
        }
    }, transitionDelay);
}

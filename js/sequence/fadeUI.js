// js/sequence/fadeUI.js

export function fadeInUI() {
    return new Promise(resolve => {
        // top left first
        d3.select("#incident-count")
            .transition().duration(800).style("opacity", 1);

        d3.select("#left .label")
            .transition().duration(800).style("opacity", 1);

        // top right a second later
        setTimeout(() => {
            d3.select("#death-count")
                .transition().duration(800).style("opacity", 1);

            d3.select("#right .label")
                .transition().duration(800).style("opacity", 1);
        }, 1000);

        // and the year bar at the bottom after that
        setTimeout(() => {
            d3.select("#year-progress-bar")
                .transition().duration(800).style("opacity", 1);

            d3.select("#year-pop-labels")
                .transition().duration(800).style("opacity", 1);
        }, 2000);

        // resolved once all three are up
        setTimeout(() => {
            resolve();
        }, 3000);
    });
}

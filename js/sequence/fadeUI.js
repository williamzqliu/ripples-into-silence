// js/sequence/fadeUI.js
//
// The frame the record is read in: the two counters and the year bar. They
// used to arrive one at a time, a second apart, which took three seconds
// to put up three empty labels and was three seconds of the opening in
// which nothing was happening that the reader had to watch. They are one
// thing, so they arrive as one.

const FADE = 900;

export function fadeInUI() {
    return new Promise(resolve => {
        d3.selectAll([
            "#incident-count", "#left .label",
            "#death-count", "#right .label",
            "#year-progress-bar", "#year-pop-labels",
        ].join(", "))
            .transition().duration(FADE).style("opacity", 1);

        setTimeout(resolve, FADE);
    });
}

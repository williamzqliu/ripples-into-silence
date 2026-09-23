// js/scenes/record/updateStats.js
//
// The two running counters in the corners. The year is not set from here
// any more: it is read off the progress bar. See yearProgressBar.js.

// Kept at module level rather than read back off the DOM, because the
// counters animate and the text on screen is mid-interpolation most of the
// time.
let totalIncidents = 0;
let totalDeaths = 0;

export function updateIncidentCount() {
    const from = totalIncidents;
    const to = ++totalIncidents;
    const format = d3.format("d");

    d3.select("#incident-count")
        .transition().duration(800)
        .tween("text", function () {
            const interp = d3.interpolateNumber(from, to);
            return function (t) {
                this.textContent = format(interp(t));
            };
        });
}

// The death count runs on its own loop rather than a d3 transition, so that
// incidents landing while it is still counting raise the target instead of
// cancelling the animation and restarting it.
let currentAnimatedValue = 0;
let targetValue = 0;
let animationFrameId = null;

export function updateDeathCount(d) {
    targetValue = totalDeaths += d.dead;

    if (animationFrameId !== null) return;

    const element = d3.select("#death-count").node();
    const duration = 500;
    let start = null;

    function animate(timestamp) {
        if (!start) start = timestamp;
        const t = Math.min((timestamp - start) / duration, 1);
        const eased = t * (2 - t);

        const current = currentAnimatedValue + (targetValue - currentAnimatedValue) * eased;
        element.textContent = Math.floor(current).toLocaleString();

        if (t < 1) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            currentAnimatedValue = targetValue;
            element.textContent = targetValue.toLocaleString();
            animationFrameId = null;
        }
    }

    // A beat behind the incident counter, so the two do not move as one.
    setTimeout(() => {
        animationFrameId = requestAnimationFrame(animate);
    }, 100);
}

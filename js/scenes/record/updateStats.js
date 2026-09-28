// js/scenes/record/updateStats.js
//
// The two running counters in the corners. Each record raises both while
// its burst spreads out and leaves its ring (renderPath.js), over the same
// time the spread takes. A record landing while a count is still running
// raises the target, and the count carries on from the figure on screen
// rather than jumping back to restart.

import { RIPPLE_OUTER_FADING_DURATION } from "../../config.js";

function counter(selector) {
    let shown = 0, from = 0, to = 0, t0 = 0, frame = null;
    const tick = now => {
        const t = Math.min((now - t0) / RIPPLE_OUTER_FADING_DURATION, 1);
        shown = from + (to - from) * t * (2 - t);
        document.querySelector(selector).textContent = Math.round(shown).toLocaleString();
        frame = t < 1 ? requestAnimationFrame(tick) : null;
    };
    return by => {
        from = shown; to += by; t0 = performance.now();
        if (frame === null) frame = requestAnimationFrame(tick);
    };
}

const records = counter("#incident-count");
const people = counter("#death-count");

export function updateIncidentCount() { records(1); }
export function updateDeathCount(d) { people(d.dead); }

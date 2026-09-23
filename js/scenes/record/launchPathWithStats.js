// js/scenes/record/launchPathWithStats.js
//
// One incident, from launch to the counters catching up with it.

import { renderPath } from "./renderPath.js";
import { intro_defs, intro_layer } from "./drawCanvas.js";
import { updateIncidentCount, updateDeathCount } from "./updateStats.js";

export function launchPathWithStats({
    d,
    gradId,
    allYears,
    yearEventCounts,
    onComplete,
    speed = 1,
    showLabel = false
}) {
    renderPath({
        d,
        gradId,
        defs: intro_defs,
        layer: intro_layer,
        speed,
        showLabel,
        onEnd: () => {
            updateIncidentCount();
            updateDeathCount(d);

            if (onComplete) onComplete();
        }
    });
}

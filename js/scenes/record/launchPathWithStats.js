// js/scenes/record/launchPathWithStats.js
//
// One record, from launch to the counters catching up with it: they rise
// while its burst spreads out (renderPath.js, updateStats.js).

import { renderPath } from "./renderPath.js";
import { intro_defs, intro_layer } from "./drawCanvas.js";
import { updateIncidentCount, updateDeathCount } from "./updateStats.js";

export function launchPathWithStats({ d, gradId, speed = 1, tail = 1, showLabel = false }) {
    renderPath({
        d,
        gradId,
        defs: intro_defs,
        layer: intro_layer,
        speed,
        tail,
        showLabel,
        onLand: () => {
            updateIncidentCount();
            updateDeathCount(d);
        },
    });
}

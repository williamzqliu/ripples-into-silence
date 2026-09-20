// js/sequence/renderPath.js
//
// One incident: a line travelling in from the edge of the fifty kilometre
// circle, stopping at the radius its recorded distance puts it at, and
// leaving a ripple sized by the number of people lost.

import {
  cx, cy,
  LAUNCH_RADIUS, LAUNCHING_SPEED, RADIUS_KM,
  RIPPLE_INNER_STROKE, RIPPLE_TRANS_DURATION,
  RIPPLE_OUTER_OPA_ORG, RIPPLE_SHOWING,
  RIPPLE_OUTER_FADING_DURATION, RIPPLE_OUTER_ENLARGE,
  RIPPLE_INNER_OPACITY_STEPS, RIPPLE_BLUR_MAX,
  LABEL_OFFSET, LABEL_NUDGES, LABEL_FADE, LABEL_HOLD
} from "../config.js";

// Where the travelling label sits relative to the head of its path:
// perpendicular to the path, then nudged clear in the angle bands where the
// perpendicular alone drops it onto the path itself.
function labelOffset(angle) {
  const nudge = LABEL_NUDGES.find(n => angle >= n.fromAngle);
  return {
    dx: Math.cos(angle + Math.PI / 2) * LABEL_OFFSET + nudge.dx,
    dy: Math.sin(angle + Math.PI / 2) * LABEL_OFFSET + nudge.dy,
  };
}

function ringOpacity(dead) {
  return RIPPLE_INNER_OPACITY_STEPS.find(s => dead <= s.upTo).opacity;
}

function labelStyle(selection) {
  return selection
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "#ffffff")
    .attr("font-size", 11)
    .attr("font-weight", "500")
    .attr("stroke", "rgba(0,0,0,0.5)")
    .attr("stroke-width", 0.6)
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("font-family", "monospace");
}

export function renderPath({ d, gradId, defs, layer, showLabel = false, speed = 1, onEnd }) {
  const fullR = LAUNCH_RADIUS;
  const visibleR = fullR * d.disappearRatio;

  const xStart = cx + Math.cos(d.angle) * fullR;
  const yStart = cy + Math.sin(d.angle) * fullR;
  const xEnd = cx + Math.cos(d.angle) * visibleR;
  const yEnd = cy + Math.sin(d.angle) * visibleR;

  const offset = labelOffset(d.angle);

  // The path fades in along its own length rather than being drawn solid,
  // so the head reads as the thing moving.
  const grad = defs.append("linearGradient")
    .attr("id", gradId)
    .attr("gradientUnits", "userSpaceOnUse");

  grad.append("stop").attr("offset", "0%").attr("stop-color", "white").attr("stop-opacity", 0);
  grad.append("stop").attr("offset", "100%").attr("stop-color", "white").attr("stop-opacity", 1);

  const path = layer.append("line")
    .attr("stroke", `url(#${gradId})`)
    .attr("stroke-width", 2)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.9);

  let label;
  if (showLabel) {
    label = labelStyle(layer.append("text")).text("...");
  }

  let progress = 0;
  let phase = "forward";
  let flashDrawn = false;
  let labelFadedIn = false;

  // Progress is advanced by elapsed time, not by a fixed step per frame.
  // The fixed step tied the animation to the display's refresh rate, so the
  // same path that took 420ms on a 60Hz screen took 210ms on a 120Hz one.
  // LAUNCHING_SPEED stays the per-frame figure the piece was tuned with,
  // read against the 60Hz it was tuned on.
  const PROGRESS_PER_MS = (LAUNCHING_SPEED * 60) / 1000;
  // A backgrounded tab stops firing frames; without a cap the first frame
  // back would jump the path most of the way to the island.
  const MAX_STEP_MS = 50;
  let lastFrame = null;

  // An invisible circle over the landing point, so the incident stays
  // inspectable after its path has gone.
  const hoverCircle = layer.append("circle")
    .attr("cx", xEnd)
    .attr("cy", yEnd)
    .attr("r", d.radius + 8)
    .attr("fill", "transparent")
    .style("cursor", "pointer");

  const tooltip = d3.select("#tooltip");

  hoverCircle
    .on("mousemove", (event) => {
      tooltip
        .html(`Year: ${d.year}<br>Distance: ${d.distance.toFixed(1)} km<br>Dead/Missing: ${d.dead}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`)
        .style("opacity", 1);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  function animate(now) {
    const elapsed = lastFrame === null ? 1000 / 60 : Math.min(now - lastFrame, MAX_STEP_MS);
    lastFrame = now;
    progress += PROGRESS_PER_MS * speed * elapsed;

    if (phase === "forward") {
      const t = Math.min(progress, 1);
      const xCurrent = xStart + (xEnd - xStart) * t;
      const yCurrent = yStart + (yEnd - yStart) * t;

      path.attr("x1", xStart).attr("y1", yStart).attr("x2", xCurrent).attr("y2", yCurrent);
      grad.attr("x1", xStart).attr("y1", yStart).attr("x2", xCurrent).attr("y2", yCurrent);

      if (showLabel) {
        // The label counts down the remaining distance as the path closes.
        const remaining = RADIUS_KM * (1 - t) + d.distance * t;
        label.text(`${remaining.toFixed(2)} km`)
          .attr("x", xCurrent + offset.dx)
          .attr("y", yCurrent + offset.dy);

        // Once, not once per frame: the flag used to be declared inside this
        // branch, so every frame scheduled another fade-in.
        if (!labelFadedIn) {
          labelFadedIn = true;
          setTimeout(() => {
            label.transition().duration(200).style("opacity", 1);
          }, 200);
        }
      }

      if (t >= 1) {
        phase = "shrink";
        progress = 0;
      }
    }

    // The tail catches up with the head, so the line collapses onto the
    // landing point rather than simply disappearing.
    else if (phase === "shrink") {
      const t = Math.min(progress, 1);
      const xShrink = xStart + (xEnd - xStart) * t;
      const yShrink = yStart + (yEnd - yStart) * t;

      path.attr("x1", xShrink).attr("y1", yShrink).attr("x2", xEnd).attr("y2", yEnd);
      grad.attr("x1", xShrink).attr("y1", yShrink).attr("x2", xEnd).attr("y2", yEnd);

      if (t >= 1 && !flashDrawn) {
        flashDrawn = true;

        // The distance label hands over to the count of people lost.
        if (showLabel) {
          label.transition().duration(LABEL_FADE).style("opacity", 0).remove();

          labelStyle(layer.append("text"))
            .attr("x", xEnd + offset.dx)
            .attr("y", yEnd + offset.dy)
            .text(`${d.dead} dead`)
            .transition().duration(LABEL_FADE).style("opacity", 1)
            .transition().delay(LABEL_HOLD).duration(LABEL_FADE).style("opacity", 0)
            .remove();
        }

        const rippleGroup = layer.append("g").attr("transform", `translate(${xEnd}, ${yEnd})`);

        // The ring stays. The disc spreads and fades.
        rippleGroup.append("circle")
          .attr("r", 0)
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-width", RIPPLE_INNER_STROKE)
          .attr("opacity", 0)
          .transition()
          .duration(RIPPLE_TRANS_DURATION)
          .attr("r", d.radius)
          .attr("opacity", ringOpacity(d.dead));

        const outer = rippleGroup.append("circle")
          .attr("r", 0)
          .attr("fill", "white")
          .attr("opacity", 0);

        outer.transition()
          .duration(RIPPLE_TRANS_DURATION)
          .attr("r", d.radius)
          .attr("opacity", RIPPLE_OUTER_OPA_ORG)
          .transition()
          .delay(RIPPLE_SHOWING)
          .duration(RIPPLE_OUTER_FADING_DURATION)
          .attr("r", d.radius * RIPPLE_OUTER_ENLARGE)
          .attr("opacity", 0)
          .tween("blur", () => t =>
            outer.style("filter", `blur(${(t * RIPPLE_BLUR_MAX).toFixed(2)}px)`))
          .remove();

        path.remove();

        setTimeout(() => {
          if (onEnd) onEnd();
        }, 500);

        return;
      }
    }

    if (!flashDrawn) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

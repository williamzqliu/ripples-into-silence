// js/sequence/renderPath.js
//
// One incident: a line travelling in from the edge of the fifty kilometre
// circle, stopping at the radius its recorded distance puts it at, and
// leaving a ripple sized by the number of people lost.

import {
  cx, cy,
  FRAME_WIDTH, FRAME_HEIGHT,
  LAUNCH_RADIUS, LAUNCHING_SPEED, RADIUS_KM,
  RIPPLE_INNER_STROKE, RIPPLE_TRANS_DURATION,
  RIPPLE_OUTER_OPA_ORG, RIPPLE_SHOWING,
  RIPPLE_OUTER_FADING_DURATION, RIPPLE_OUTER_ENLARGE,
  RIPPLE_INNER_OPACITY_STEPS, RIPPLE_BLUR_MAX,
  LABEL_FONT, LABEL_SIZE, LABEL_OFFSET, LABEL_GAP, LABEL_MARK_CLEAR,
  LABEL_FADE, LABEL_HOLD
} from "../config.js";

import {
  unit, halfBox, pushOut, boxAt, inFrame, overlaps, overlapsDisc
} from "./labelGeometry.js";

// ---------------------------------------------------------------- placing
//
// The old rule put the centre of the label a fixed twenty-six pixels
// perpendicular to the path, with three hand-set nudges for the angle bands
// where that was not enough. It was not enough because twenty-six pixels is
// measured to the centre of a box sixty pixels wide: whenever the
// perpendicular ran horizontally, half the label was still lying on top of
// whatever it was meant to be clearing. Hence "206 dead" sitting inside its
// own mark. labelGeometry holds the rule that replaces it.

// Every mark whose disc is still solid on screen. A count has to clear the
// mark it names, and it has to clear the two or three that landed just
// before it, which are the ones nearest to it.
const liveMarks = new Set();

/** Every other piece of text already on the canvas: the three ring labels,
    and the labels of the paths still in flight. */
function otherText(node) {
  const svg = node.ownerSVGElement;
  if (!svg) return [];
  // `.leaving` is on the labels that are already fading out, including the
  // travelling one this count is replacing. Making room for text that will
  // be gone in three hundred milliseconds pushes the count away for nothing.
  return Array.from(svg.querySelectorAll("text:not(.leaving)"))
    .filter(t => t !== node)
    .map(t => t.getBBox());
}

/** Perpendicular first, either side, then straight out and straight in.
    Angle is the path's own, measured from the centre of the frame. */
// The side of the path both labels sit on: the distance while the path is
// travelling, then the count once it lands. The count used to try the
// other side, and then straight out and in, whenever its first spot was
// taken, so the reading could jump across the line at the moment it
// changed from kilometres to deaths. It stays on this side now and moves
// further out along it instead.
const LABEL_SIDE = Math.PI / 2;
const STEP_OUT = 6;           // px further out per try
const MAX_STEPS = 10;

function placeLabel(node, own, angle) {
  const box = halfBox(node);
  const u = unit(angle + LABEL_SIDE);
  const taken = otherText(node);
  // The own mark is cleared by the distance itself, so testing it again here
  // would only risk failing on the rounding.
  const discs = Array.from(liveMarks).filter(m => m !== own);

  const fallback = pushOut(own, u, own.r * LABEL_MARK_CLEAR, box, LABEL_GAP);
  for (let k = 0; k <= MAX_STEPS; k++) {
    const c = pushOut(own, u, own.r * LABEL_MARK_CLEAR + k * STEP_OUT, box, LABEL_GAP);
    const b = boxAt(c, box);
    if (!inFrame(b)) break;          // further out only leaves the frame sooner
    if (taken.some(t => overlaps(b, t, LABEL_GAP))) continue;
    if (discs.some(m => overlapsDisc(b, m, m.r * LABEL_MARK_CLEAR + LABEL_GAP))) continue;
    return c;
  }

  // Nowhere clean. Keep it on the canvas and let it land where it lands:
  // an overlap that can be read past beats a label cropped by the frame.
  return {
    x: Math.min(Math.max(fallback.x, box.w + 2), FRAME_WIDTH - box.w - 2),
    y: Math.min(Math.max(fallback.y, box.h + 2), FRAME_HEIGHT - box.h - 2),
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
    .attr("font-size", LABEL_SIZE)
    .attr("font-weight", "500")
    /* Painted behind the glyphs rather than over them. Without paint-order
       the halo eats into the letterforms, which is the opposite of the job,
       and at 0.6 of a transparent black it was not covering anything
       anyway. The page colour at 3 is what the ring labels use. */
    .attr("stroke", "#0F1A32")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("font-family", LABEL_FONT)
    .style("font-variant-numeric", "tabular-nums lining-nums");
}

export function renderPath({ d, gradId, defs, layer, showLabel = false, speed = 1, onEnd }) {
  const fullR = LAUNCH_RADIUS;
  const visibleR = fullR * d.disappearRatio;

  const xStart = cx + Math.cos(d.angle) * fullR;
  const yStart = cy + Math.sin(d.angle) * fullR;
  const xEnd = cx + Math.cos(d.angle) * visibleR;
  const yEnd = cy + Math.sin(d.angle) * visibleR;

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

  // Perpendicular to its own path, clear of the line by the width of the
  // text. Worked out once at launch: the label travels with the head, and
  // re-solving it every frame would have it twitching from side to side.
  let label, offset = { dx: 0, dy: 0 };
  if (showLabel) {
    label = labelStyle(layer.append("text")).text(`${RADIUS_KM.toFixed(2)} km`);
    const box = halfBox(label.node());
    const u = unit(d.angle + LABEL_SIDE);
    const at = pushOut({ x: 0, y: 0 }, u, LABEL_OFFSET, box, LABEL_GAP);
    offset = { dx: at.x, dy: at.y };
  }

  let progress = 0;
  let phase = "forward";
  let flashDrawn = false;
  let labelFadedIn = false;
  let fadeInTimer = null;

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
        // Held so the handover below can cancel it. A fast path lands before
        // this fires, and the fade-in it then schedules interrupts the
        // fade-out, leaving the distance label on screen for good with the
        // count sitting underneath it.
        if (!labelFadedIn) {
          labelFadedIn = true;
          fadeInTimer = setTimeout(() => {
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

        // Registered whether or not this path carries a label: ninety-one of
        // the ninety-four do not, and their discs are in the way just the
        // same. The ripple below takes it off again when it has faded.
        const mark = { x: xEnd, y: yEnd, r: d.radius };
        liveMarks.add(mark);

        // The distance label hands over to the count of people lost.
        if (showLabel) {
          clearTimeout(fadeInTimer);
          label.classed("leaving", true)
            .transition().duration(LABEL_FADE).style("opacity", 0).remove();

          // The count is static, so it can be solved properly: clear of the
          // mark it names, clear of the ring labels and of any other mark
          // still on screen, and inside the frame.
          const count = labelStyle(layer.append("text")).text(`${d.dead} dead`);
          const spot = placeLabel(count.node(), mark, d.angle);

          count
            .attr("x", spot.x)
            .attr("y", spot.y)
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
          .on("end", () => liveMarks.delete(mark))
          .on("interrupt", () => liveMarks.delete(mark))
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

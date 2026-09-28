// js/scenes/record/renderPath.js
//
// One record: a line travelling in from the edge of the fifty kilometre
// circle, stopping at the radius its recorded distance puts it at, and
// leaving a ripple sized by the number of people lost. The legend's paths
// also carry their distance as they travel, then their count.

import { recordTooltip, showTooltip } from "../../data/tooltip.js";
import { isOnScene } from "./onScene.js";

import {
  cx, cy,
  FRAME_WIDTH, FRAME_HEIGHT,
  LAUNCH_RADIUS, LAUNCHING_SPEED, RADIUS_KM,
  RIPPLE_INNER_STROKE, RIPPLE_TRANS_DURATION,
  RIPPLE_OUTER_OPA_ORG, RIPPLE_SHOWING,
  RIPPLE_OUTER_FADING_DURATION, RIPPLE_OUTER_ENLARGE,
  RIPPLE_INNER_OPACITY_STEPS, RIPPLE_BLUR_MAX,
  LABEL_FONT, LABEL_SIZE, LABEL_GAP, LABEL_MARK_CLEAR,
  LABEL_DELAY, LABEL_FADE, LABEL_HOLD, LABEL_OWN_CLEAR
} from "../../config.js";

import {
  halfBox, inFrame, overlaps, overlapsDisc
} from "./labelGeometry.js";

// ---------------------------------------------------------------- placing

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

// Level with the end of the path, on the side away from the line, so the
// reading sits beside the point it names; then level on the other side;
// then straight above it, then straight below. The first of those that
// covers nothing wins: not the line itself, not Lampedusa's cross, not
// other text, not a mark still on screen, and not the frame's edge. The
// near edge of the text is what is placed, so the distance and the count
// that replaces it start at the same point whatever their lengths.
const CROSS_CLEAR = 12;       // px kept clear round the cross

function spots(at, clear, box, angle) {
  const g = LABEL_GAP, w = box.w * 2, h = box.h * 2;
  const away = Math.cos(angle) > 0 ? -1 : 1;
  const level = s => ({
    anchor: s > 0 ? "start" : "end", x: at.x + s * (clear + g), y: at.y,
    rect: { x: s > 0 ? at.x + clear + g : at.x - clear - g - w, y: at.y - box.h, width: w, height: h },
  });
  const upright = s => ({
    anchor: "middle", x: at.x, y: at.y + s * (clear + g + box.h),
    rect: { x: at.x - box.w, y: s < 0 ? at.y - clear - g - h : at.y + clear + g, width: w, height: h },
  });
  return [level(away), level(-away), upright(-1), upright(1)];
}

function crosses(line, r, pad = 2) {
  for (let k = 0; k <= 40; k++) {
    const x = line.x1 + (line.x2 - line.x1) * k / 40, y = line.y1 + (line.y2 - line.y1) * k / 40;
    if (x > r.x - pad && x < r.x + r.width + pad && y > r.y - pad && y < r.y + r.height + pad) return true;
  }
  return false;
}

function chooseSpot(node, at, clear, box, angle, line, own) {
  const taken = otherText(node);
  const discs = Array.from(liveMarks).filter(m => m !== own);
  const all = spots(at, clear, box, angle);
  return all.find(s => inFrame(s.rect) &&
    !(line && crosses(line, s.rect)) &&
    !overlapsDisc(s.rect, { x: cx, y: cy }, CROSS_CLEAR) &&
    !taken.some(t => overlaps(s.rect, t, LABEL_GAP)) &&
    !discs.some(m => overlapsDisc(s.rect, m, m.r * LABEL_MARK_CLEAR + LABEL_GAP))) || all[0];
}

function ringOpacity(dead) {
  return RIPPLE_INNER_OPACITY_STEPS.find(s => dead <= s.upTo).opacity;
}

function labelStyle(selection) {
  return selection
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", "#ffffff")
    // Never under MIN_TEXT_PX on screen, however far the drawing is scaled.
    .style("font-size", `max(${LABEL_SIZE}px, var(--min-text, 0px))`)
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

/** How long a path takes from launch to its ripple, travel and collapse,
    so the clock can launch it early enough to land on its date. */
export function travelMs(speed = 1, tail = 1) {
  return (1 + 1 / tail) / ((LAUNCHING_SPEED * 60) / 1000 * speed);
}

export function renderPath({ d, gradId, defs, layer, showLabel = false, speed = 1, tail = 1, onLand }) {
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

  // Worked out once at launch, for where the path will end, and sized for
  // the count that will replace the distance there, the longer of the two.
  // The label travels with the head at the same offset: re-solving it every
  // frame would have it twitching from side to side.
  let label, spot = null, offset = { dx: 0, dy: 0 };
  // Clear of the mark's own disc, not of the burst that spreads from it,
  // which is fading by the time the count is read: the burst's reach threw
  // the label a long way off the point it names.
  const clearR = d.radius * LABEL_OWN_CLEAR;
  const countText = `${d.dead} dead or missing`;
  if (showLabel) {
    label = labelStyle(layer.append("text")).text(countText);
    spot = chooseSpot(label.node(), { x: xEnd, y: yEnd }, clearR, halfBox(label.node()), d.angle,
      { x1: xStart, y1: yStart, x2: xEnd, y2: yEnd }, null);
    label.text(`${RADIUS_KM.toFixed(2)} km`).attr("text-anchor", spot.anchor);
    offset = { dx: spot.x - xEnd, dy: spot.y - yEnd };
  }

  let progress = 0;
  let phase = "forward";
  let flashDrawn = false;
  let age = 0;                // ms on screen, for the label's fade-in

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
      showTooltip(event, recordTooltip(d));
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  function animate(now) {
    const elapsed = lastFrame === null ? 1000 / 60 : Math.min(now - lastFrame, MAX_STEP_MS);
    lastFrame = now;
    if (!isOnScene()) { requestAnimationFrame(animate); return; }
    // `tail` quickens the collapse on its own, for the slow opening paths.
    progress += PROGRESS_PER_MS * speed * (phase === "shrink" ? tail : 1) * elapsed;

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

        // As the original did it: a beat after launch, then quickly up.
        // Counted in frames on screen, so it holds with the path.
        age += elapsed;
        const a = Math.min(Math.max((age - LABEL_DELAY) / LABEL_FADE, 0), 1);
        label.style("opacity", a * a * (3 - 2 * a));
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

        // Registered whether or not this path carries a label: most do not,
        // and their discs are in the way just the same. The ripple below
        // takes it off again when it has faded.
        const mark = { x: xEnd, y: yEnd, r: d.radius };
        liveMarks.add(mark);

        // The distance label hands over to the count of people lost.
        if (showLabel) {
          label.classed("leaving", true)
            .transition().duration(LABEL_FADE)
            .style("opacity", 0).remove();

          // The count is static, so it can be solved properly: clear of the
          // mark it names, clear of the ring labels and of any other mark
          // still on screen, and inside the frame.
          const count = labelStyle(layer.append("text")).text(countText);
          // Where the distance was, unless something has landed there since.
          const taken = otherText(count.node());
          const stillClear = !taken.some(t => overlaps(spot.rect, t, LABEL_GAP)) &&
            ![...liveMarks].some(m => m !== mark && overlapsDisc(spot.rect, m, m.r * LABEL_MARK_CLEAR + LABEL_GAP));
          const at = stillClear ? spot :
            chooseSpot(count.node(), mark, clearR, halfBox(count.node()), d.angle, null, mark);

          // Crossfaded with the distance, in the same place, as the mark bursts.
          count
            .attr("text-anchor", at.anchor)
            .attr("x", at.x)
            .attr("y", at.y)
            .transition().duration(LABEL_FADE)
            .style("opacity", 1)
            .transition().delay(LABEL_HOLD).duration(LABEL_FADE)
            .style("opacity", 0)
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
          // The counters count up while the burst spreads out and leaves
          // its ring, over the same time.
          .on("start", () => { if (onLand) onLand(); })
          .attr("r", d.radius * RIPPLE_OUTER_ENLARGE)
          .attr("opacity", 0)
          .tween("blur", () => t =>
            outer.style("filter", `blur(${(t * RIPPLE_BLUR_MAX).toFixed(2)}px)`))
          .on("end", () => liveMarks.delete(mark))
          .on("interrupt", () => liveMarks.delete(mark))
          .remove();

        path.remove();
        return;
      }
    }

    if (!flashDrawn) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

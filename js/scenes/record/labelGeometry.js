// js/scenes/record/labelGeometry.js
//
// Putting a label somewhere it can be read. The travelling labels and the
// ring labels have the same problem from opposite ends: one has a fixed
// obstacle and a free position, the other a fixed position and obstacles
// that arrive over the next twelve seconds.
//
// The rule both use: a box of half-width w and half-height h reaches
// |ux|w + |uy|h from its own centre in direction u, so putting the centre
// that far beyond an obstacle puts the near edge of the text on the far
// edge of the obstacle, whichever way u happens to point. Offsetting by a
// fixed distance instead, which is what this piece used to do, only clears
// the obstacle when u runs along the short side of the box: a label sixty
// pixels wide pushed twenty-six pixels sideways is still sitting on top of
// the thing it was supposed to have cleared.

import { FRAME_WIDTH, FRAME_HEIGHT } from "../../config.js";

export function unit(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Half the rendered box of a <text>, in user units. */
export function halfBox(node) {
  const b = node.getBBox();
  return { w: b.width / 2, h: b.height / 2 };
}

/** How far the box extends from its own centre in direction u. */
function reach(u, box) {
  return Math.abs(u.x) * box.w + Math.abs(u.y) * box.h;
}

/** The centre that puts the box `gap` clear of a disc of radius `clear`. */
export function pushOut(from, u, clear, box, gap) {
  const dist = clear + reach(u, box) + gap;
  return { x: from.x + u.x * dist, y: from.y + u.y * dist };
}

export function boxAt(c, box) {
  return { x: c.x - box.w, y: c.y - box.h, width: box.w * 2, height: box.h * 2 };
}

export function inFrame(b, pad = 2) {
  return b.x >= pad && b.y >= pad &&
    b.x + b.width <= FRAME_WIDTH - pad && b.y + b.height <= FRAME_HEIGHT - pad;
}

export function overlaps(a, b, pad = 0) {
  return a.x < b.x + b.width + pad && a.x + a.width + pad > b.x &&
    a.y < b.y + b.height + pad && a.y + a.height + pad > b.y;
}

/** Box against disc, by the closest point on the box to the centre. */
export function overlapsDisc(b, centre, radius) {
  const nx = Math.max(b.x, Math.min(centre.x, b.x + b.width));
  const ny = Math.max(b.y, Math.min(centre.y, b.y + b.height));
  return Math.hypot(centre.x - nx, centre.y - ny) < radius;
}

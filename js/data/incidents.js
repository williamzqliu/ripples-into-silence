// js/data/incidents.js

import {
  cx, cy, LAUNCH_RADIUS, DISTANCE_RINGS_KM, RING_LABEL_GAP,
  RING_LABEL_W, RING_LABEL_H, RING_LABEL_CLEAR,
  SCALE_DEAD_MIN, SCALE_DEAD_MAX,
  RADIUS_KM, radiusFractionFor, GOLDEN_ANGLE
} from "../config.js";

export async function loadAndProcessData(csvPath = "./data/lampedusa_nearby_incidents.csv") {
  const rawData = await d3.csv(csvPath);

  const events = rawData
    .filter(d =>
      d["Incident Year"] &&
      d["Total Number of Dead and Missing"] &&
      d["Distance_to_Lampedusa_km"]
    )
    .map(d => ({
      id: d["Main ID"],
      date: d["Incident Date"],
      location: d["Location of Incident"],
      note: d.Location_note,
      confirmedDead: d["Number of Dead"],
      missing: d["Minimum Estimated Number of Missing"],
      year: +d["Incident Year"],
      dead: +d["Total Number of Dead and Missing"],
      distance: +d["Distance_to_Lampedusa_km"]
    })).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(events, d => d.dead))
    .range([SCALE_DEAD_MIN, SCALE_DEAD_MAX]);

  const paths = events.map(d => ({
    ...d,
    radius: rScale(d.dead),
    disappearRatio: radiusFractionFor(d.distance)
  }));

  // Angle is the one free variable here: the piece never asks anyone to read
  // it. It used to be handed out in CSV row order, which is chronological, so
  // each year owned a contiguous wedge and marks at a similar distance sat
  // next to each other. Fifty-eight of the ninety-four landing points
  // overlapped another one. Walking the golden angle down the radius order
  // puts consecutive radii 137.5 degrees apart and brings that to ten,
  // without moving a single mark off the distance it was recorded at.
  [...paths]
    .sort((a, b) => a.disappearRatio - b.disappearRatio)
    // Wrapped into one turn: the angle window that picks the opening paths,
  // the sector buckets and the label nudges all read it as a bearing.
  .forEach((d, k) => { d.angle = (k * GOLDEN_ANGLE) % (2 * Math.PI); });

  // The ring labels sit at the top of their rings, and four marks landed on
  // them, the 82-person record of May 2017 eight pixels into "10 km". Each
  // is turned, a degree at a time, just far enough to clear its label. Its
  // distance does not change; only the direction, which carries nothing.
  const labels = [RADIUS_KM, ...DISTANCE_RINGS_KM].map(km => {
    const r = LAUNCH_RADIUS * radiusFractionFor(km);
    return { x: cx - RING_LABEL_W / 2, y: cy - r - RING_LABEL_GAP - RING_LABEL_H, w: RING_LABEL_W, h: RING_LABEL_H };
  });
  const clearance = (d, angle) => {
    const R = LAUNCH_RADIUS * d.disappearRatio;
    const x = cx + Math.cos(angle) * R, y = cy + Math.sin(angle) * R;
    return Math.min(...labels.map(b => Math.hypot(x - Math.max(b.x, Math.min(x, b.x + b.w)),
      y - Math.max(b.y, Math.min(y, b.y + b.h))) - d.radius));
  };
  const STEP = Math.PI / 180;
  for (const d of paths) {
    if (clearance(d, d.angle) >= RING_LABEL_CLEAR) continue;
    const away = d.angle < 1.5 * Math.PI ? -1 : 1;     // away from the top
    let a = d.angle;
    for (let k = 0; k < 45 && clearance(d, a) < RING_LABEL_CLEAR; k++) a += away * STEP;
    d.angle = a;
  }

  const allYears = [...new Set(paths.map(p => p.year))].sort((a, b) => a - b);

  return { paths, allYears };
}

// js/data/incidents.js

import {
  SCALE_DEAD_MIN, SCALE_DEAD_MAX,
  RADIUS_KM, radiusFractionFor,
  ANGLE_BUCKETS, GOLDEN_ANGLE, INITIAL_INCIDENTS,
  FEATURED_DEAD, FEATURED_DISTANCE,
  FEATURED_ANGLE_MIN_DEG, FEATURED_ANGLE_MAX_DEG
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
      year: +d["Incident Year"],
      dead: +d["Total Number of Dead and Missing"],
      distance: +d["Distance_to_Lampedusa_km"]
    }));

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

  const yearEventCounts = {};
  paths.forEach(p => {
    yearEventCounts[p.year] = (yearEventCounts[p.year] || 0) + 1;
  });

  const allYears = Object.keys(yearEventCounts)
    .sort((a, b) => a - b)
    .map(Number);

  // The opening is chosen for legibility: small enough to read at a glance
  // and near enough that the path does not take all day to arrive.
  const initialPool = paths.filter(p =>
    p.dead > 1 && p.dead <= FEATURED_DEAD && p.disappearRatio < FEATURED_DISTANCE
  );

  // Launched from the lower half of the circle, where the travelling label
  // has room beside the path.
  const firstBatch = initialPool
    .filter(d => {
      const angleDeg = d.angle * 180 / Math.PI;
      return angleDeg >= FEATURED_ANGLE_MIN_DEG && angleDeg <= FEATURED_ANGLE_MAX_DEG;
    })
    .slice(0, INITIAL_INCIDENTS);

  const remainingPaths = paths.filter(p => !firstBatch.includes(p));

  const buckets = Array.from({ length: ANGLE_BUCKETS }, () => []);
  remainingPaths.forEach(p => {
    const angleNorm = (p.angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const sector = Math.floor((angleNorm / (2 * Math.PI)) * ANGLE_BUCKETS);
    buckets[sector].push(p);
  });

  return {
    paths,
    allYears,
    yearEventCounts,
    firstBatch,
    remainingBuckets: buckets
  };
}

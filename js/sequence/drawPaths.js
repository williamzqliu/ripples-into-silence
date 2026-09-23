// js/sequence/drawPaths.js
//
// The release schedule.
//
// It used to be a clock: three incidents six seconds apart, then a
// setInterval handing out the remaining ninety-one every four hundred
// milliseconds, about seventy seconds of film in a section a reader passes
// through in three. Scrolling did nothing at all while it ran, which is a
// strange thing for the centrepiece of a scrollytelling page to do. The
// reader's one control was connected to nothing, so a pinned frame that
// would not respond read as the page having stopped working.
//
// Where the reader is in the section is now how much of the record has
// been released. Scroll down and the incidents land, the counters climb
// and the year turns over; scroll back up and they go again. A slow scroll
// releases them one at a time and you watch each path come in. A flick
// puts them straight down without the flight, because forty paths in the
// air at once is noise rather than speed.

import {
  ANGLE_BUCKETS, INITIAL_SPEED, MAX_CURRENT,
  CEREMONY_SHARE, SCRUB_AHEAD
} from "../config.js";

import { renderPath } from "./renderPath.js";
import { intro_defs, intro_layer } from "./drawCanvas.js";
import { sceneProgress } from "./onScene.js";
import { setTotals } from "./updateStats.js";
import { setBarProgress, updateProgress } from "./yearProgressBar.js";

/** The whole record in the order it is released: the three legible openers
    first, then a round robin over the angular sectors so consecutive
    incidents arrive from different directions. This was walked lazily by
    the old scheduler; releasing by scroll needs it flat and up front,
    because the reader can ask for the fortieth one directly. */
function releaseOrder(firstBatch, remainingBuckets) {
  const order = [...firstBatch];
  const buckets = remainingBuckets.map(b => [...b]);
  const sectors = d3.shuffle(d3.range(ANGLE_BUCKETS));

  let pointer = 0;
  let left = buckets.reduce((n, b) => n + b.length, 0);
  while (left > 0) {
    const bucket = buckets[sectors[pointer]];
    pointer = (pointer + 1) % ANGLE_BUCKETS;
    if (bucket.length) {
      order.push(bucket.shift());
      left--;
    }
  }
  return order;
}

/** Which year label belongs at each point in the release. The year used to
    be advanced as a side effect of incidents landing, with a table of
    per-year millisecond offsets nudging the label back into step. Worked
    out up front it is just a lookup, it cannot drift, and it reverses. */
function yearIndexPerRelease(order, allYears, yearEventCounts) {
  const out = [];
  let index = 0;
  let sinceTurn = 0;

  for (let i = 0; i < order.length; i++) {
    sinceTurn++;
    out.push(index);
    if (sinceTurn >= yearEventCounts[allYears[index]] && index < allYears.length - 1) {
      index++;
      sinceTurn = 0;
    }
  }
  return out;
}

export function drawPaths({ allYears, yearEventCounts, firstBatch, remainingBuckets }) {
  const order = releaseOrder(firstBatch, remainingBuckets);
  const yearAt = yearIndexPerRelease(order, allYears, yearEventCounts);
  const total = order.length;

  // One entry per incident on screen, in release order, each holding the
  // group renderPath drew it into.
  const shown = [];
  let deaths = 0;
  let inFlight = 0;
  let gradCount = 0;
  let pumping = false;

  function release(instant) {
    const i = shown.length;
    const d = order[i];
    const opener = i < firstBatch.length;

    // Closed once, whether the path finished its flight or was scrolled
    // back off the screen mid-air. Counting only the ones that land leaks
    // the tally upwards every time a reader scrolls back through a path
    // still travelling, and once it reaches MAX_CURRENT the release stops
    // letting anything else out at all.
    const entry = { d, node: null, open: true };
    entry.close = () => {
      if (!entry.open) return;
      entry.open = false;
      inFlight--;
    };

    inFlight++;
    entry.node = renderPath({
      d,
      gradId: `grad${gradCount++}`,
      defs: intro_defs,
      layer: intro_layer,
      showLabel: opener && !instant,
      speed: opener ? INITIAL_SPEED : 1,
      instant,
      onEnd: entry.close,
    });

    shown.push(entry);
    deaths += d.dead;
  }

  function retract() {
    const last = shown.pop();
    if (!last) return;
    deaths -= last.d.dead;
    last.close();
    // renderPath's own loop stops once the group is off the document, so
    // there is no timer left to chase down here.
    if (last.node) last.node.remove();
  }

  // The opening ceremony owns the first stretch of the section. The record
  // is mapped onto what is left, so scrolling during the island and the
  // circle does not bank incidents that have nowhere to land yet.
  function recordProgress() {
    const p = sceneProgress();
    return Math.min(Math.max((p - CEREMONY_SHARE) / (1 - CEREMONY_SHARE), 0), 1);
  }

  function pump() {
    const target = Math.round(recordProgress() * total);
    const gap = target - shown.length;

    if (gap === 0) {
      pumping = false;
      return;
    }

    // One a frame while the reader is close behind, so each path is seen
    // arriving. Further behind than that and they go down as marks.
    const scrubbing = Math.abs(gap) > SCRUB_AHEAD;

    if (gap > 0) {
      if (scrubbing) {
        for (let k = 0; k < Math.min(gap, 40); k++) release(true);
      } else {
        // A full sky is not a reason to stop. Releasing nothing until a path
        // landed held the scroll for as long as the slowest thing in the air,
        // which with the slow openers was three seconds of a page that had
        // stopped answering. The mark goes down without the flight instead:
        // the record stays level with the reader either way.
        release(inFlight >= MAX_CURRENT);
      }
    } else {
      for (let k = 0; k < (scrubbing ? Math.min(-gap, 40) : 1); k++) retract();
    }

    setTotals(shown.length, deaths);
    setBarProgress(shown.length / total);
    updateProgress(shown.length ? yearAt[shown.length - 1] : 0);

    requestAnimationFrame(pump);
  }

  function kick() {
    if (pumping) return;
    pumping = true;
    requestAnimationFrame(pump);
  }

  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  kick();
}

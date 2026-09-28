import { launchPathWithStats } from "./launchPathWithStats.js";
import { isOnScene } from "./onScene.js";
import { travelMs } from "./renderPath.js";
import { setProgress } from "./yearProgressBar.js";
import {
  LAUNCH_RADIUS, LAUNCHING_SPEED,
  LABEL_FADE, LABEL_HOLD,
  RIPPLE_TRANS_DURATION, RIPPLE_SHOWING, RIPPLE_OUTER_FADING_DURATION
} from "../../config.js";
// The record, one path after another, in date order, against a bar that
// fills at one steady rate and never stops while the section is on screen.
//
// The schedule is worked out in time first, the moment each record bursts,
// and the bar's years are laid out from it: a year starts where its first
// record bursts, so its label lights at that moment.
//
// The opening. The first five go out slowly, one at a time: each waits for
// everything the one before it did to finish, its ripple and, in the
// legend, its count, and each is quicker than the one before, easing into
// the normal pace at the sixth. All five are the legend, with their
// distance and count beside them.
//
// After it, each record takes one even slot, so a year's stretch is as long
// as the year has records: the crowded years take longest, and nothing
// speeds up to suggest the risk grew. A year never gets less than its label
// needs; within its stretch its records are evenly spaced.
//
// A record at the rim, within a few pixels of 50 km, has almost no path to
// fly, and used to spend a slow opening path's full time on a line one
// pixel long. Its line is still drawn, briefly.
const PLAY_MS = 76000;
const MAX_STEP_MS = 100;      // a frame after a pause is not a jump
const LEGEND = 5;
const OPENING = 5;
// How fast the head moves on screen, in px per ms, for the first five. Set
// as a speed on screen rather than a travel time, because every path takes
// the same time whatever its length: at one time each, the third, 268px
// long, crossed the frame eight times faster than the first, which is 52.
const OPENING_PX_PER_MS = [0.06, 0.08, 0.11, 0.15, 0.22];
// Their tails collapse this much faster than the heads travel.
const OPENING_TAIL = 2.5;
// The least time from one opening burst to the next, easing in.
const OPENING_GAPS = [4400, 3900, 3300, 2200, 1600];
const AFTER = 150;            // ms of stillness before the next sets out
// A path shorter than this, and how long its line takes, forward and back:
// long enough in the legend for its distance to be read.
const SHORT_PX = 6;
const SHORT_MS = { legend: [700, 300], other: [200, 100] };
// What a record is still doing after it bursts: its count, in the legend,
// or its ripple.
const COUNT_MS = LABEL_FADE + LABEL_HOLD + LABEL_FADE;
const RIPPLE_MS = RIPPLE_TRANS_DURATION + RIPPLE_SHOWING + RIPPLE_OUTER_FADING_DURATION;

const PROGRESS_PER_MS = LAUNCHING_SPEED * 60 / 1000;   // at speed 1

/** Every record's burst and launch, and the years' bounds on the bar.
    `lead` and `least` are shares of the bar: the run before the first year,
    and the least a year needs for its label. */
export function planRecord(paths, allYears, { lead, least }) {
  const items = paths.map((d, i) => {
    const legend = i < LEGEND;
    const length = LAUNCH_RADIUS * (1 - d.disappearRatio);
    let speed = 1, tail = i < OPENING ? OPENING_TAIL : 1;
    if (length < SHORT_PX) {
      const [go, back] = SHORT_MS[legend ? "legend" : "other"];
      speed = 1 / (PROGRESS_PER_MS * go); tail = go / back;
    } else if (i < OPENING) {
      speed = Math.min(1, OPENING_PX_PER_MS[i] / (PROGRESS_PER_MS * length));
    }
    const trip = travelMs(speed, tail);
    return { d, i, legend, speed, tail, trip, settle: legend ? Math.max(COUNT_MS, RIPPLE_MS) : RIPPLE_MS };
  });

  // The opening, one after another, each waiting on the last.
  items[0].burst = lead * PLAY_MS;
  for (let k = 1; k <= OPENING && k < items.length; k++) {
    const a = items[k - 1];
    items[k].burst = a.burst + Math.max(OPENING_GAPS[k - 1], a.settle + items[k].trip + AFTER);
  }

  // The rest share what is left, a slot each, with every year given at
  // least its label's room.
  const rest = items.slice(OPENING);
  const t0 = rest[0].burst, room = PLAY_MS - t0, min = least * PLAY_MS;
  const years = [...new Set(rest.map(it => it.d.year))];
  const count = y => rest.filter(it => it.d.year === y).length;
  const fixed = new Set();
  let slot = 0;
  for (let pass = 0; pass < years.length; pass++) {
    const free = years.filter(y => !fixed.has(y));
    slot = (room - fixed.size * min) / free.reduce((s, y) => s + count(y), 0);
    const short = free.filter(y => y !== years[0] && count(y) * slot < min);
    if (!short.length) break;
    short.forEach(y => fixed.add(y));
  }
  let t = t0;
  for (const y of years) {
    const list = rest.filter(it => it.d.year === y);
    const span = fixed.has(y) ? min : list.length * slot;
    list.forEach((it, k) => { it.burst = t + span * k / list.length; });
    t += span;
  }

  for (const it of items) it.launch = it.burst - it.trip;
  // Each year from its first burst to the next year's.
  const firsts = allYears.map(y => items.find(it => it.d.year === y).burst / PLAY_MS);
  const bounds = allYears.map((year, k) => ({ year, from: firsts[k], to: firsts[k + 1] ?? 1 }));
  return { queue: [...items].sort((a, b) => a.launch - b.launch || a.i - b.i), bounds };
}

export function drawPaths({ queue }) {
  // Starts early enough for the first path to be sent before the bar moves.
  let played = Math.min(0, queue[0].launch), next = 0, last = null;
  setProgress(0);
  return new Promise(resolve => {
    const frame = now => {
      const dt = last === null ? 0 : Math.min(now - last, MAX_STEP_MS);
      last = now;
      if (isOnScene()) played += dt;
      while (next < queue.length && queue[next].launch <= played) {
        const { d, i, speed, tail, legend } = queue[next++];
        launchPathWithStats({ d, gradId: `grad${i}`, showLabel: legend, speed, tail });
      }
      setProgress(Math.max(0, played) / PLAY_MS);
      if (played < PLAY_MS) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

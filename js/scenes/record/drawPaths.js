// js/scenes/record/drawPaths.js
//
// The release schedule. The first few incidents go out one at a time and
// travel slowly, so a viewer has time to see that one path is one incident.
// After that the scheduler takes over and the gap closes to MIN_GAP, which
// is what turns the later years into something you watch accumulate.

import {
  ANGLE_BUCKETS, LAUNCH_INTERVAL,
  INITIAL_DELAY, INITIAL_SPEED, FIRST_DELAY, MAX_CURRENT, MIN_GAP
} from "../../config.js";

import { launchPathWithStats } from "./launchPathWithStats.js";
import { isOnScene, whenOnScene, sceneWait } from "./onScene.js";

export function drawPaths({ allYears, yearEventCounts, firstBatch, remainingBuckets }) {
  let active = 0;
  let lastLaunchTime = 0;
  let gradCount = 0;

  const sectorOrder = d3.shuffle(d3.range(ANGLE_BUCKETS));
  let sectorPointer = 0;

  // One launch, whichever phase asks for it. The two phases differ only in
  // whether the path carries a label and how fast it travels.
  function launch(d, { showLabel = false, speed = 1 } = {}) {
    active++;
    launchPathWithStats({
      d,
      gradId: `grad${gradCount++}`,
      allYears,
      yearEventCounts,
      showLabel,
      speed,
      onComplete: () => active--,
    });
  }

  // Phase one: the slow opening. Three incidents, six seconds apart, each
  // one waiting for the reader to be there for it. Written as a loop rather
  // than a setTimeout wrapping a setInterval, because a schedule that can
  // pause has to be able to say where it paused.
  //
  // The waits count only time spent on screen, the same as the bar. On the
  // wall clock a reader who left during the six seconds between openers
  // came back to the next one already gone and the bar six seconds behind.
  async function launchInitial() {
    await sceneWait(FIRST_DELAY);

    for (const d of firstBatch) {
      await whenOnScene();
      launch(d, { showLabel: true, speed: INITIAL_SPEED });
      await sceneWait(INITIAL_DELAY);
    }

    launchGrouped();
  }

  // Phase two: round robin over the angular sectors, so consecutive paths
  // arrive from different directions instead of stacking up in one place.
  function launchGrouped() {
    const interval = setInterval(() => {
      // Ninety-one of the ninety-four go out here, over about half a
      // minute. Off screen the queue simply stops moving, so a reader who
      // leaves and comes back finds the record where they left it rather
      // than finished without them.
      if (!isOnScene()) return;

      const now = Date.now();
      if (active >= MAX_CURRENT || now - lastLaunchTime < MIN_GAP) return;

      for (let tries = 0; tries < ANGLE_BUCKETS; tries++) {
        const bucket = remainingBuckets[sectorOrder[sectorPointer]];
        sectorPointer = (sectorPointer + 1) % ANGLE_BUCKETS;

        if (bucket.length > 0) {
          lastLaunchTime = now;
          launch(bucket.shift());
          break;
        }
      }

      if (remainingBuckets.every(b => b.length === 0)) clearInterval(interval);
    }, LAUNCH_INTERVAL);
  }

  launchInitial();
}

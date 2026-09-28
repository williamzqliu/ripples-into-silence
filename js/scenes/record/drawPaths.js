import { launchPathWithStats } from "./launchPathWithStats.js";
import { sceneWait, whenOnScene } from "./onScene.js";
import { setRecordTime } from "./yearProgressBar.js";
// Dates determine order. The first three records hold for reading; after
// that every historical day uses the same playback interval.
export async function drawPaths({ paths, allYears, yearEventCounts }) {
  const start = Date.UTC(allYears[0], 0, 1);
  const end = Date.UTC(allYears.at(-1) + 1, 0, 1);
  const scale = 60000 / (end - start);
  let time = start;
  setRecordTime(time);
  for (let i = 0; i < paths.length; i++) {
    const d = paths[i], target = Date.parse(d.date + "T00:00:00Z");
    // Advance the same clock used by the year labels and the event queue.
    const duration = (target - time) * scale;
    const steps = Math.max(1, Math.ceil(duration / 50));
    const from = time;
    for (let k = 1; k <= steps; k++) {
      await sceneWait(duration / steps);
      time = from + (target - from) * k / steps;
      setRecordTime(time);
    }
    await whenOnScene();
    launchPathWithStats({ d, gradId: `grad${i}`, allYears, yearEventCounts,
      showLabel: i < 3, speed: i < 3 ? 0.4 : 1 });
    if (i < 3) await sceneWait(6000);
  }
  // Leave the last year visible while its final marks settle.
  await sceneWait(3000);
  setRecordTime(end);
}

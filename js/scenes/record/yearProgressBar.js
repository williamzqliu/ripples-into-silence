// The year bar. drawPaths.js works out when each record bursts, and a year
// runs from its first record's burst to the next year's, so its label,
// set at the start of that stretch, lights as the fill reaches its left
// end. Six of the twelve years hold one to four records, so a year is never
// given less than its label needs, or their labels ran into one another.
const LABEL_GAP = 12;         // px between one label and the next
// The bar runs this far before 2014 begins, so the first label is not
// pinned to the bar's end and the fill has a moment to get going.
const LEAD = 20;

let bounds = [];              // [{ year, from, to }] as shares of the bar

/** The labels, not yet placed, and the room they need as shares of the bar. */
export function initYearLabels(allYears) {
  const root = d3.select("#year-pop-labels").html("");
  const labels = allYears.map(year => root.append("div").attr("class", "year-pop inactive")
    .attr("id", `pop-${year}`).style("top", "-34px").text(year));
  const width = root.node().clientWidth || 1;
  const least = Math.max(...labels.map(l => l.node().offsetWidth)) + LABEL_GAP;
  return { lead: LEAD / width, least: least / width };
}

export function placeYearLabels(yearBounds) {
  bounds = yearBounds;
  for (const b of bounds) d3.select(`#pop-${b.year}`).style("left", `${b.from * 100}%`);
}

export function setProgress(progress) {
  const p = Math.max(0, Math.min(1, progress));
  d3.select("#year-progress-fill").style("transform", `scaleX(${p})`);
  // None is lit once the last year has run out.
  const lit = p < 1 ? bounds.find(b => p >= b.from && p < b.to) : null;
  d3.selectAll(".year-pop").classed("active", false).classed("inactive", true);
  if (lit) d3.select(`#pop-${lit.year}`).classed("active", true).classed("inactive", false);
}

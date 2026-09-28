let years = [];
export function initYearProgressBar(allYears) {
  years = allYears;
  const root = d3.select("#year-pop-labels").html("");
  years.forEach((year, i) => root.append("div").attr("class", "year-pop inactive")
    .attr("id", `pop-${year}`).style("top", "-34px")
    .style("left", `${(i + 0.5) / years.length * 100}%`).text(year));
}
export function setRecordTime(time) {
  const start = Date.UTC(years[0], 0, 1), end = Date.UTC(years.at(-1) + 1, 0, 1);
  const progress = Math.max(0, Math.min(1, (time - start) / (end - start)));
  d3.select("#year-progress-fill").style("transform", `scaleX(${progress})`);
  const year = new Date(Math.min(time, end - 1)).getUTCFullYear();
  d3.selectAll(".year-pop").classed("active", d => false).classed("inactive", true);
  d3.select(`#pop-${year}`).classed("active", true).classed("inactive", false);
}

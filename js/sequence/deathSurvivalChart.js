// js/scene-outro/deathSurvivalChart.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function drawDeathSurvivalChart(containerId) {
  const container = d3.select(containerId);
  container.html("");

  const width = 900;
  const height = 400;
  const margin = { top: 60, right: 30, bottom: 50, left: 60 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#0f1a32");

  const tooltip = d3.select("#tooltip");

// ---------- the eleven year line
const years = d3.range(2014, 2025);
const deaths = [85, 103, 120, 97, 110, 130, 142, 155, 173, 190, 206];

const lineGroup = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const lineWidth = width * 0.5;
const chartHeight = height - margin.top - margin.bottom;

// Half a year of padding at each end, so 2014 and 2024 are not cut in half
// by the plot edge.
const xScale = d3.scaleLinear()
  .domain([2013.5, 2024.5])  
  .range([0, lineWidth]);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(deaths) + 30])
  .range([chartHeight, 0]);

const line = d3.line()
  .x((d, i) => xScale(years[i]))
  .y((d) => yScale(d));

// the line
lineGroup.append("path")
  .datum(deaths)
  .attr("fill", "none")
  .attr("stroke", "white")
  .attr("stroke-width", 2)
  .attr("d", line);

// the points, and their tooltips
lineGroup.selectAll("circle")
  .data(deaths)
  .enter()
  .append("circle")
  .attr("cx", (d, i) => xScale(years[i]))
  .attr("cy", (d) => yScale(d))
  .attr("r", (d, i) => years[i] === 2024 ? 6 : 4) // 2024 is the year the piece ends on
  .attr("fill", (d, i) => years[i] === 2024 ? "#fbc900" : "white") // and the only one in yellow
  .attr("stroke", (d, i) => years[i] === 2024 ? "#fbc900" : "none")
  .attr("stroke-width", 2)
  .on("mouseover", (event, d) => {
    const i = deaths.indexOf(d);
    tooltip.html(`<strong>Year:</strong> ${years[i]}<br><strong>Deaths:</strong> ${d}`)
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px")
      .style("opacity", 0.95);
  })
  .on("mousemove", (event) => {
    tooltip.style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
  });


  // x axis
  lineGroup.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(11))
    .selectAll("text")
    .attr("fill", "white");

  // y axis
  lineGroup.append("g")
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll("text")
    .attr("fill", "white");

  // title
  lineGroup.append("text")
    .attr("x", lineWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", 16)
    .text("Migrant Deaths Near Lampedusa (2014–2024)");

  // ---------- the dashed divider
  svg.append("line")
    .attr("x1", width / 2 + 100)
    .attr("x2", width / 2 + 100)
    .attr("y1", margin.top - 10)
    .attr("y2", height - margin.bottom + 10)
    .attr("stroke", "white")
    .attr("stroke-dasharray", "4 4")
    .attr("stroke-opacity", 0.2);

// ---------- the bars
  const barGroup = svg.append("g")
    .attr("transform", `translate(${width / 2 + 140},${margin.top})`);

  const barData = [
    { label: "Deaths (2024)", value: 206, color: "#fbc900" },
    { label: "Survivors (2024)", value: 45997, color: "#6EC4FF" }
  ];

  const barWidth = 60;
  const barSpacing = 90;

  const yBarScale = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.value)])
    .range([chartHeight, 0]);

  // bars
  barGroup.selectAll("rect")
    .data(barData)
    .enter()
    .append("rect")
    .attr("x", (_, i) => i * barSpacing)
    .attr("y", d => yBarScale(d.value))
    .attr("width", barWidth)
    .attr("height", d => chartHeight - yBarScale(d.value))
    .attr("fill", d => d.color)
    .on("mouseover", (event, d) => {
      tooltip.html(`${d.label}<br>${d.value.toLocaleString()}`)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px")
        .style("opacity", 0.9);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // value labels
  barGroup.selectAll("text.value")
    .data(barData)
    .enter()
    .append("text")
    .attr("class", "value")
    .text(d => d.value.toLocaleString())
    .attr("x", (_, i) => i * barSpacing + barWidth / 2)
    .attr("y", d => yBarScale(d.value) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", 12);

  // legend title
  barGroup.append("text")
    .attr("x", (barData.length * barSpacing) / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", 16)
    .text("2024: Dead vs. Arrived");
}

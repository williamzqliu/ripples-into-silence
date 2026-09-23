// js/sequence/arrivalsField.js
//
// 2024, at one dot per person. 45,997 people reached Lampedusa and 206 did
// not, so the field holds 46,203 dots and the 206 are 0.45 per cent of it.
// At the top of the section they cannot be picked out, which is the point:
// the arrivals are what gets counted. Scrolling fades the 45,997 away and
// the 206 stay behind, then sort themselves by what killed them.
//
// One dot is one person the whole way down. Nothing is rescaled, so the
// second half is the same field with most of it taken out, not a second
// chart drawn at a different rate.

import { ARRIVALS_2024, ARRIVALS_SOURCE, LABEL_FONT } from "../config.js";

const CAUSES = [
  { key: "Drowning", label: "Drowning", shape: "disc" },
  { key: "Vehicle accident", label: "Vehicle accident", shape: "half" },
  { key: "Harsh environmental", label: "Harsh conditions", shape: "bowtie" },
  { key: "Sickness", label: "Sickness", shape: "ring" },
];

const DEAD_COLOUR = "#FFFFFF";
const ARRIVED_COLOUR = "#FBC900";

// Deterministic, so the same person is in the same place on every load.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shortCause(raw) {
  const s = (raw || "").toLowerCase();
  if (s.startsWith("drowning")) return "Drowning";
  if (s.startsWith("vehicle")) return "Vehicle accident";
  if (s.startsWith("harsh")) return "Harsh environmental";
  if (s.startsWith("sickness")) return "Sickness";
  return "Drowning";
}

export async function drawArrivalsField(sectionSelector, canvasSelector) {
  const section = document.querySelector(sectionSelector);
  const canvas = document.querySelector(canvasSelector);
  if (!section || !canvas) return;

  // The heading counts what is actually on screen: it runs down from 46,203
  // to 206 as the arrivals fade, on the same curve, so the number and the
  // field always agree. It used to jump from one to the other half way.
  const countEl = section.querySelector(".arrivals__num");
  // And it is the colour of what it counts: the arrivals' yellow, turning to
  // the white of the 206 as they are left alone in the field.
  const countColour = d3.interpolateRgb(ARRIVED_COLOUR, DEAD_COLOUR);
  const noteEl = section.querySelector(".arrivals__note");
  let shownCount = null;
  let captionState = null;

  const rows = await d3.csv("./data/lampedusa_nearby_incidents.csv");
  const dead2024 = rows.filter(r => r["Incident Year"] === "2024");

  // One entry per person, carrying the incident it belongs to.
  const people = [];
  for (const r of dead2024) {
    const n = +r["Total Number of Dead and Missing"] || 0;
    const cause = shortCause(r["Cause of Death"]);
    for (let i = 0; i < n; i++) people.push({ cause, date: r["Incident Date"] });
  }
  people.sort((a, b) =>
    CAUSES.findIndex(c => c.key === a.cause) - CAUSES.findIndex(c => c.key === b.cause));

  const total = ARRIVALS_2024 + people.length;
  const ctx = canvas.getContext("2d");

  let field = null;        // { pitch, cols, rows, deadIndex: Int32Array, offscreen }
  let dpr = 1;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // A pitch that fits every person in the frame, then the grid that follows.
    const pitch = Math.sqrt((w * h) / total);
    const cols = Math.max(1, Math.floor(w / pitch));
    const rowsN = Math.ceil(total / cols);
    const dotR = Math.max(0.6, pitch * 0.31);
    const originX = (w - cols * pitch) / 2 + pitch / 2;
    const originY = (h - rowsN * pitch) / 2 + pitch / 2;

    // Which cells in the field are the 206. Spread evenly through the whole
    // field rather than clustered, because they are not a block of the year.
    const rnd = mulberry32(20241231);
    const slot = total / people.length;
    const deadCells = people.map((_, i) => Math.min(total - 1,
      Math.floor(i * slot + rnd() * slot)));

    const isDead = new Uint8Array(total);
    deadCells.forEach(c => { isDead[c] = 1; });

    const cellXY = (c) => ({
      x: originX + (c % cols) * pitch,
      y: originY + Math.floor(c / cols) * pitch,
    });

    // The 45,997 never move, so they are painted once and then only faded.
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext("2d");
    octx.scale(dpr, dpr);
    octx.fillStyle = ARRIVED_COLOUR;
    for (let c = 0; c < total; c++) {
      if (isDead[c]) continue;
      const { x, y } = cellXY(c);
      octx.beginPath();
      octx.arc(x, y, dotR, 0, Math.PI * 2);
      octx.fill();
    }

    // Where the 206 end up: one block per cause, in the order of the legend,
    // set on the left edge the heading and the text above are set on.
    const markR = Math.max(3.5, Math.min(7, w / 150));
    const gap = markR * 3.1;
    const gridCols = Math.max(10, Math.min(30, Math.floor((w * 0.55) / gap)));
    const gridRows = Math.ceil(people.length / gridCols);
    const gx = markR;
    // The legend hangs below the grid, so the pair is centred together rather
    // than the grid alone, which left a hole between it and the heading.
    const legendH = markR * 4.4 * (CAUSES.length + 1) + markR * 7;
    const gy = (h - (gridRows - 1) * gap - legendH) / 2;

    people.forEach((p, i) => {
      const src = cellXY(deadCells[i]);
      p.x0 = src.x; p.y0 = src.y;
      p.x1 = gx + (i % gridCols) * gap;
      p.y1 = gy + Math.floor(i / gridCols) * gap;
    });

    field = { pitch, dotR, markR, offscreen: off, gridRows, gx, gy, gap };
  }

  const ease = t => t * t * (3 - 2 * t);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  function draw(progress) {
    if (!field) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // The arrivals hold, then go.
    const gone = ease(clamp01((progress - 0.30) / 0.28));
    const fade = 1 - gone;
    if (fade > 0.002) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(field.offscreen, 0, 0);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // The 206 travel to their places and grow into their marks.
    const move = ease(clamp01((progress - 0.52) / 0.36));
    const r = field.dotR + (field.markR - field.dotR) * move;

    ctx.fillStyle = DEAD_COLOUR;
    ctx.strokeStyle = DEAD_COLOUR;
    ctx.lineWidth = Math.max(1, r * 0.34);

    for (const p of people) {
      const x = p.x0 + (p.x1 - p.x0) * move;
      const y = p.y0 + (p.y1 - p.y0) * move;
      const shape = move > 0.55
        ? CAUSES.find(c => c.key === p.cause).shape
        : "disc";
      mark(ctx, shape, x, y, r);
    }

    legend(ctx, w, h, ease(clamp01((progress - 0.82) / 0.18)));

    const count = Math.round(total - (total - people.length) * gone);
    if (countEl && count !== shownCount) {
      shownCount = count;
      countEl.textContent = count.toLocaleString("en-US");
      countEl.style.color = countColour(gone);
    }

    // The note says which field it is, and changes once, half way down.
    const state = gone < 0.5 ? "all" : "dead";
    if (noteEl && state !== captionState) {
      captionState = state;
      noteEl.textContent = state === "all"
        ? "Everyone who set out for Lampedusa in 2024 and reached this water. " +
          "One dot is one person."
        : "The same field, with everyone who reached the island taken out of it.";
    }
  }

  function mark(c, shape, x, y, r) {
    c.beginPath();
    if (shape === "disc") {
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    } else if (shape === "half") {
      c.arc(x, y, r, Math.PI, 0);
      c.closePath();
      c.fill();
    } else if (shape === "bowtie") {
      c.moveTo(x - r, y - r); c.lineTo(x + r, y - r);
      c.lineTo(x - r, y + r); c.lineTo(x + r, y + r);
      c.closePath();
      c.fill();
    } else {
      c.arc(x, y, r * 0.78, 0, Math.PI * 2);
      c.stroke();
    }
  }

  function legend(c, w, h, alpha) {
    if (alpha < 0.01) return;
    const counts = new Map();
    for (const p of people) counts.set(p.cause, (counts.get(p.cause) || 0) + 1);

    const r = Math.max(3.5, Math.min(7, w / 150));
    const lineH = r * 4.4;
    const top = field.gy + (field.gridRows - 1) * field.gap + r * 7;
    const x = field.gx - r;       // the marks line up with the grid's first column

    c.save();
    c.globalAlpha = alpha;
    c.font = `${Math.max(15, r * 2.3)}px ${LABEL_FONT}`;
    c.textBaseline = "middle";

    CAUSES.forEach((cause, i) => {
      const y = top + i * lineH;
      c.fillStyle = DEAD_COLOUR;
      c.strokeStyle = DEAD_COLOUR;
      c.lineWidth = Math.max(1, r * 0.34);
      mark(c, cause.shape, x + r, y, r);

      c.fillStyle = "rgba(255,255,255,0.55)";
      c.textAlign = "left";
      c.fillText(`${counts.get(cause.key) || 0}  ${cause.label}`, x + r * 3.4, y);
    });

    c.fillStyle = "rgba(255,255,255,0.3)";
    c.textAlign = "left";
    c.fillText(ARRIVALS_SOURCE, x + r, top + CAUSES.length * lineH + lineH * 0.4);
    c.restore();
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;
    draw(progress);
  }

  layout();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { layout(); onScroll(); });
}

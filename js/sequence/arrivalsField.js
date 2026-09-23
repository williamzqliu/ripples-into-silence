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

// Each cause is a block of its own, labelled where it stands. They used to
// share one block, told apart by four shapes, a disc, a half disc, a bowtie
// and a ring, read off a legend underneath: a code to learn for 26 of the
// 206, and the half discs ran on in the drowned's last row. The labels say
// what the record says, in IOM's categories: "Vehicle accident / death
// linked to hazardous transport", "Harsh environmental conditions / lack of
// adequate shelter, food, water", "Sickness / lack of access to adequate
// healthcare".
const CAUSES = [
  { key: "Drowning", label: "drowned" },
  { key: "Vehicle accident", label: "died in hazardous transport" },
  { key: "Harsh environmental", label: "died of exposure, hunger or thirst" },
  { key: "Sickness", label: "died of sickness, without care" },
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

    // Where the 206 end up: a block per cause, one under the next, on the
    // left edge the heading and the text above are set on. Each block's
    // label sits after its first row, so it is read with the block.
    const markR = Math.max(3.5, Math.min(7, w / 150));
    const gap = markR * 3.1;
    const blockGap = gap * 1.6;          // between one cause and the next
    const gridCols = Math.max(10, Math.min(30, Math.floor((w * 0.55) / gap)));
    const gx = markR;

    const blocks = [];
    let rowsAbove = 0, gapsAbove = 0;
    for (const cause of CAUSES) {
      const n = people.filter(p => p.cause === cause.key).length;
      if (!n) continue;
      blocks.push({ cause, n, row: rowsAbove, gaps: gapsAbove,
        firstRow: Math.min(n, gridCols) });
      rowsAbove += Math.ceil(n / gridCols);
      gapsAbove += 1;
    }
    // Centred with the source line under it.
    const sourceH = gap * 2.4;
    const blocksH = (rowsAbove - 1) * gap + (blocks.length - 1) * blockGap;
    const gy = (h - blocksH - sourceH) / 2;
    const rowY = (b, k) => gy + (b.row + k) * gap + b.gaps * blockGap;

    let i = 0;
    for (const b of blocks) {
      for (let k = 0; k < b.n; k++, i++) {
        const p = people[i];
        const src = cellXY(deadCells[i]);
        p.x0 = src.x; p.y0 = src.y;
        p.x1 = gx + (k % gridCols) * gap;
        p.y1 = rowY(b, Math.floor(k / gridCols));
      }
      b.labelX = gx + (b.firstRow - 1) * gap + markR + gap * 0.9;
      b.labelY = rowY(b, 0);
    }
    const sourceY = gy + blocksH + sourceH;

    field = { pitch, dotR, markR, offscreen: off, gx, gap, blocks, sourceY };
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
    for (const p of people) {
      const x = p.x0 + (p.x1 - p.x0) * move;
      const y = p.y0 + (p.y1 - p.y0) * move;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    labels(ctx, ease(clamp01((progress - 0.82) / 0.18)));

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

  // The number in white, what happened in the text's white after it.
  function labels(c, alpha) {
    if (alpha < 0.01) return;
    c.save();
    c.globalAlpha = alpha;
    c.textAlign = "left";
    c.textBaseline = "middle";
    const size = 18;
    for (const b of field.blocks) {
      c.font = `${size}px ${LABEL_FONT}`;
      c.fillStyle = DEAD_COLOUR;
      const num = `${b.n} `;
      c.fillText(num, b.labelX, b.labelY);
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.fillText(b.cause.label, b.labelX + c.measureText(num).width, b.labelY);
    }
    c.font = `15px ${LABEL_FONT}`;
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.fillText(ARRIVALS_SOURCE, field.gx - field.markR, field.sourceY);
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

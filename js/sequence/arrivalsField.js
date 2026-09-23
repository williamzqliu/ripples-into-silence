// js/sequence/arrivalsField.js
//
// 2024, at one dot per person. 45,997 people reached Lampedusa and 206 did
// not, so the field holds 46,203 dots and the 206 are 0.45 per cent of it.
//
// It opens close up, on a few hundred people, each a dot large enough to be
// one person, and one of them white. Scrolling draws back until the whole
// field is on screen and the count has climbed to 46,203, and by then the
// white ones cannot be picked out, which is the point: the arrivals are what
// gets counted. It used to open on the whole field, 46,203 dots two pixels
// across, which read as a sheet of yellow cloth. Scrolling on fades the
// 45,997 away and the 206 stay behind, then sort themselves by what killed
// them.
//
// One dot is one person the whole way down. Nothing is rescaled, so the
// second half is the same field with most of it taken out, not a second
// chart drawn at a different rate.

import { ARRIVALS_2024, LABEL_FONT } from "../config.js";

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

// The close-up: dots this far apart, about 11px across, a few hundred in
// view and one or two of them white.
const CLOSE_PITCH = 34;

// Close up, the frame's edges cut through dots, and a row of half dots
// along the top and the bottom read as a mistake. The edges fade out
// instead, over this share of the frame's shorter side, narrowing as the
// view draws back, to none by the time the whole field, which fits, is on
// screen. At 48px, a row and a half, the fade dimmed the outer two rows
// evenly and the field read as a raised platform with bevelled edges; this
// wide and eased, it reads as the field going on into the dark.
const FEATHER = 0.2;

// The scroll through the track, 0 to 1: the close-up holds, draws back, the
// whole field holds, the arrivals fade, the 206 sort, the labels come in.
// On a 340vh track, 2.4 screens of scroll: the draw back takes 0.4 of a
// screen, a third of what it first had, and everything after it the same
// scroll as before.
const ZOOM_FROM_AT = 0.042;
const ZOOM_TO_AT = 0.208;
const FADE_FROM_AT = 0.317;
const FADE_TO_AT = 0.555;
const MOVE_FROM_AT = 0.502;
const MOVE_TO_AT = 0.875;
const LABELS_AT = 0.827;

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

  // The heading counts what is actually on screen: up to 46,203 as the view
  // draws back, then down to 206 as the arrivals fade, on the same curve, so
  // the number and the field always agree.
  const countEl = section.querySelector(".arrivals__num");
  // And it is the colour of what it counts: the arrivals' yellow, turning to
  // the white of the 206 as they are left alone in the field.
  const countColour = d3.interpolateRgb(ARRIVED_COLOUR, DEAD_COLOUR);
  const noteEl = section.querySelector(".arrivals__note");
  let shownCount = null;
  let captionState = null;
  let noteTimer = null;
  const NOTE_FADE_MS = 150;       // the note's transition in style.css

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

    // Which cells in the field are the 206: drawn at random, from a fixed
    // seed. They used to be one to each run of 224 cells, and a row of the
    // field is about 224 cells long, so close up they stood in a column.
    const rnd = mulberry32(20241231);
    const cells = new Int32Array(total);
    for (let c = 0; c < total; c++) cells[c] = c;
    const deadCells = people.map((_, i) => {
      const j = i + Math.floor(rnd() * (total - i));
      const c = cells[j]; cells[j] = cells[i]; cells[i] = c;
      return c;
    });

    const isDead = new Uint8Array(total);
    deadCells.forEach(c => { isDead[c] = 1; });

    // The close-up is centred on the white dot nearest the middle.
    const mid = { x: w / 2, y: h / 2 };
    let anchor = null, best = Infinity;
    for (const c of deadCells) {
      const x = originX + (c % cols) * pitch, y = originY + Math.floor(c / cols) * pitch;
      const d = (x - mid.x) ** 2 + (y - mid.y) ** 2;
      if (d < best) { best = d; anchor = { x, y }; }
    }

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
    // left edge the heading and the text above are set on, each with its
    // label over its top left corner.
    const markR = Math.max(3.5, Math.min(7, w / 150));
    const gap = markR * 3.1;
    const labelH = 30;                   // label line to the block's first row
    const blockGap = gap * 2.4;          // last row to the next label, well over
                                         // the label to its own row, so each
                                         // label reads with the block below it
    const gridCols = Math.max(10, Math.min(30, Math.floor((w * 0.55) / gap)));
    const gx = markR;

    // Laid out from 0, then the whole stack, source line and all, centred.
    const blocks = [];
    let y = 0;
    for (const cause of CAUSES) {
      const n = people.filter(p => p.cause === cause.key).length;
      if (!n) continue;
      const rowsN = Math.ceil(n / gridCols);
      blocks.push({ cause, n, labelY: y, firstY: y + labelH });
      y += labelH + (rowsN - 1) * gap + blockGap;
    }
    const top = (h - (y - blockGap)) / 2;

    let i = 0;
    for (const b of blocks) {
      b.labelY += top;
      b.firstY += top;
      b.labelX = gx - markR;
      for (let k = 0; k < b.n; k++, i++) {
        const p = people[i];
        const src = cellXY(deadCells[i]);
        p.x0 = src.x; p.y0 = src.y;
        p.x1 = gx + (k % gridCols) * gap;
        p.y1 = b.firstY + Math.floor(k / gridCols) * gap;
      }
    }

    field = { pitch, dotR, markR, offscreen: off, gx, gap, blocks,
      cols, originX, originY, isDead, anchor, zoomFrom: CLOSE_PITCH / pitch };
  }

  const ease = t => t * t * (3 - 2 * t);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // Fade what is drawn to nothing at the frame's edges, px wide.
  function featherEdges(w, h, px) {
    if (px < 0.5) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    const smooth = t => t * t * (3 - 2 * t);
    for (const [x1, y1, len] of [[w, 0, w], [0, h, h]]) {
      const g = ctx.createLinearGradient(0, 0, x1, y1);
      const f = Math.min(0.5, px / len);
      for (let k = 0; k <= 6; k++) {
        const t = k / 6, a = smooth(t).toFixed(3);
        g.addColorStop(f * t, `rgba(0,0,0,${a})`);
        g.addColorStop(1 - f * t, `rgba(0,0,0,${a})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // Every dot inside the view at zoom z, drawn as one path, and how many
  // people that is. Near the end of the draw back, where the view holds
  // most of the field and a path of forty thousand arcs takes 18ms, the
  // bitmap is scaled up instead, and the dots are only counted.
  const BITMAP_BELOW = 1.4;
  function drawZoomed(z, w, h) {
    const paint = z >= BITMAP_BELOW;
    if (!paint) {
      const { anchor, offscreen } = field;
      ctx.save();
      ctx.setTransform(dpr * z, 0, 0, dpr * z,
        dpr * anchor.x * (1 - z), dpr * anchor.y * (1 - z));
      ctx.drawImage(offscreen, 0, 0, w, h);
      ctx.restore();
    }
    const { pitch, cols, originX, originY, isDead, anchor, dotR } = field;
    const r = dotR * z;
    const x0 = anchor.x + (-r - anchor.x) / z, x1 = anchor.x + (w + r - anchor.x) / z;
    const y0 = anchor.y + (-r - anchor.y) / z, y1 = anchor.y + (h + r - anchor.y) / z;
    const c0 = Math.max(0, Math.ceil((x0 - originX) / pitch));
    const c1 = Math.min(cols - 1, Math.floor((x1 - originX) / pitch));
    const r0 = Math.max(0, Math.ceil((y0 - originY) / pitch));
    const r1 = Math.floor((y1 - originY) / pitch);

    let seen = 0;
    ctx.fillStyle = ARRIVED_COLOUR;
    ctx.beginPath();
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const c = row * cols + col;
        if (c >= total) break;
        seen++;
        if (!paint || isDead[c]) continue;
        const sx = anchor.x + (originX + col * pitch - anchor.x) * z;
        const sy = anchor.y + (originY + row * pitch - anchor.y) * z;
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
    }
    if (paint) ctx.fill();
    return seen;
  }

  function draw(progress) {
    if (!field) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // The view draws back from the close-up to the whole field, at a steady
    // rate in scale rather than in size, so it does not rush at the end.
    const zoomT = ease(clamp01((progress - ZOOM_FROM_AT) / (ZOOM_TO_AT - ZOOM_FROM_AT)));
    const z = Math.pow(field.zoomFrom, 1 - zoomT);
    const zoomed = z > 1.0005;
    const toScreen = (x, y) => zoomed
      ? [field.anchor.x + (x - field.anchor.x) * z, field.anchor.y + (y - field.anchor.y) * z]
      : [x, y];

    // The arrivals hold, then go.
    const gone = ease(clamp01((progress - FADE_FROM_AT) / (FADE_TO_AT - FADE_FROM_AT)));
    const fade = 1 - gone;
    let seen = total;
    if (zoomed) seen = drawZoomed(z, w, h);
    else if (fade > 0.002) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(field.offscreen, 0, 0);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // The 206 travel to their places and grow into their marks.
    const move = ease(clamp01((progress - MOVE_FROM_AT) / (MOVE_TO_AT - MOVE_FROM_AT)));
    const r = zoomed ? field.dotR * z : field.dotR + (field.markR - field.dotR) * move;

    ctx.fillStyle = DEAD_COLOUR;
    ctx.beginPath();
    for (const p of people) {
      const [x, y] = toScreen(p.x0 + (p.x1 - p.x0) * move, p.y0 + (p.y1 - p.y0) * move);
      if (x < -r || x > w + r || y < -r || y > h + r) continue;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    if (zoomed) featherEdges(w, h,
      FEATHER * Math.min(w, h) * Math.log(z) / Math.log(field.zoomFrom));

    labels(ctx, ease(clamp01((progress - LABELS_AT) / (1 - LABELS_AT))));

    const count = zoomed ? seen
      : Math.round(total - (total - people.length) * gone);
    if (countEl && count !== shownCount) {
      shownCount = count;
      countEl.textContent = count.toLocaleString("en-US");
      countEl.style.color = countColour(gone);
    }

    // The note says which field it is, and changes once, when the count has
    // come all the way down to the 206 it names.
    const state = count > people.length ? "all" : "dead";
    if (noteEl && state !== captionState) {
      const first = captionState === null;
      captionState = state;
      const text = state === "all"
        ? "Everyone who set out for Lampedusa in 2024 and reached this water. " +
          "One dot is one person."
        : "The 206 who died or went missing before reaching the island.";
      // Out, swap, in; on the first draw the markup already says it.
      clearTimeout(noteTimer);
      if (first) noteEl.textContent = text;
      else {
        noteEl.classList.add("is-swapping");
        noteTimer = setTimeout(() => {
          noteEl.textContent = text;
          noteEl.classList.remove("is-swapping");
        }, NOTE_FADE_MS);
      }
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

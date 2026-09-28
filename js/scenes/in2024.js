// js/scenes/in2024.js
//
// The twelve annual discs become the people behind them. The discs and the
// people share one pinned stage, and the scroll position alone sets every
// position, so scrolling back runs the same frames in reverse.
//
// In order: the canvas takes over each record's white mark exactly where
// the SVG drew it, while the years, figures, rings and crosses fade. The
// marks drift together towards the middle and, overlapping that, each one
// splits into as many equal dots as its record counts, the mark itself
// shrinking or growing into them. The dots draw together into the shape
// of Lampedusa, hold there a moment, and come apart into cause groups; the
// labels come up, and the stage holds for reading before the epilogue.
// (The file keeps its old name from when this scene was "In 2024".)
//
// Source positions are read off the rendered SVG marks every frame, so the
// handover lands on the pixel whatever size the discs are drawn at.
import { CAUSES, expandPeople } from '../data/people.js';
import { reducedMotion } from '../core/motion.js';
import { settleDiscs } from './elevenYears.js';
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const phase = (p, [from, len]) => ease((p - from) / len);

// Where each step runs, as a share of the pinned scroll.
const HAND = .09;            // the canvas takes the marks; the rest starts fading
const FADE = [.09, .09];
const GATHER = [.16, .18];
const SPLIT = [.20, .16];
const ISLAND = [.31, .17];   // the people draw together into Lampedusa
                             // and it holds, .48 to .53
const SORT = [.53, .22];     // then it comes apart into the groups
const CAPTION = [.56, .12];
const LABELS = [.75, .06];   // then held from .81 to the end
const STAGGER = .35;         // how much of a move is spread across the dots
const BEND = .22;            // how far a path into the island bows off the straight line
const FLOW = .12;            // and out of it, one way for all, so they move as one

const GATHER_TO = .45;       // how far the whole field closes on the middle
const MARK_ALPHA = .9;       // the SVG marks' fill-opacity
const FONT = "'EB Garamond', Georgia, serif";
const CAUSE_COLOUR = '#FBC900';   // the page's yellow, the island's
const LABEL_PX = 17, LINE_H = 21, LABEL_GAP = 8, BLOCK_GAP = 18, COL_GAP = 48, PAD = 24;
const PITCH_MAX = 20, PITCH_MIN = 4;

export async function initIn2024() {
  const track = document.querySelector('.people-track');
  const stage = document.querySelector('.people-stage');
  const canvas = document.querySelector('#people-canvas');
  if (!track || !stage || !canvas) return;
  const grid = stage.querySelector('#year-discs');
  const caption = stage.querySelector('.people-caption');
  const note = stage.querySelector('.people-note');
  const ctx = canvas.getContext('2d');
  const rows = await d3.csv('./data/lampedusa_nearby_incidents.csv');
  const people = expandPeople(rows);
  people.forEach((p, i) => { p.order = i / people.length; });
  caption.querySelector('[data-people-count]').textContent = people.length.toLocaleString('en-US');
  const groups = CAUSES.map(c => ({ ...c, people: people.filter(p => p.cause === c.key) })).filter(g => g.people.length);
  const summary = stage.querySelector('.people-accessible');
  summary.textContent = groups.map(g => `${g.label}: ${g.people.length}`).join('. ') +
    '. Each circle represents one person recorded dead or missing, grouped by the cause reported for their record.';
  let width = 0, height = 0, dpr = 1, radius = 3, centre = { x: 0, y: 0 }, frame = null;

  const labelFont = weight => `${weight} ${LABEL_PX}px ${FONT}`;
  function wrap(text, w) {
    const lines = []; let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > w) { lines.push(line); line = word; } else line = next;
    }
    return [...lines, line];
  }

  // Stacks groups down a column: each label, then its dots in rows.
  // Returns the height used, and places the dots when asked to.
  function column(list, x, y0, w, pitch, place) {
    const cols = Math.max(1, Math.floor(w / pitch));
    let y = y0;
    for (const g of list) {
      g.lines = wrap(`${g.label}  ${g.people.length}`, w);
      g.x = x; g.y = y;
      const dotsTop = y + g.lines.length * LINE_H + LABEL_GAP;
      if (place) g.people.forEach((p, i) => {
        p.tx = x + radius + (i % cols) * pitch;
        p.ty = dotsTop + radius + Math.floor(i / cols) * pitch;
      });
      y = dotsTop + Math.ceil(g.people.length / cols) * pitch + BLOCK_GAP;
    }
    return y - BLOCK_GAP - y0;
  }

  // The largest pitch at which the drowning group on the left and the six
  // smaller groups on the right both fit between the caption and the note,
  // trying a range of column splits at each pitch and keeping the one that
  // levels the two columns best. Every group uses the same pitch and radius.
  function layout() {
    width = stage.clientWidth; height = stage.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.font = labelFont(500);
    const inner = width - PAD * 2 - COL_GAP;
    const capH = caption.offsetHeight, noteH = note.offsetHeight;
    const room = height - capH - noteH - 28 - 20 - 24;
    const [first, rest] = [groups.slice(0, 1), groups.slice(1)];
    let best = null;
    for (let pitch = PITCH_MAX; pitch >= PITCH_MIN && !best; pitch -= .25) {
      for (let f = .42; f <= .72; f += .01) {
        const lw = inner * f, rw = inner - lw;
        const hl = column(first, 0, 0, lw, pitch), hr = column(rest, 0, 0, rw, pitch);
        if (Math.max(hl, hr) > room) continue;
        const score = Math.abs(hl - hr);
        if (!best || score < best.score) best = { pitch, lw, rw, h: Math.max(hl, hr), score };
      }
    }
    best ||= { pitch: PITCH_MIN, lw: inner * .58, rw: inner * .42, h: room };
    radius = best.pitch * .31;
    // The caption, the groups and the note as one block, centred in the stage.
    const top0 = Math.max(12, (height - (capH + 28 + best.h + 20 + noteH)) / 2);
    const top = top0 + capH + 28;
    caption.style.top = `${top0}px`;
    note.style.top = `${top + best.h + 20}px`;
    centre = { x: width / 2, y: top + best.h / 2 };
    column(first, PAD, top, best.lw, best.pitch, true);
    column(rest, PAD + best.lw + COL_GAP, top, best.rw, best.pitch, true);
    // Each record's dots spread over about the area they will fill.
    for (const p of people) p.spread = Math.sqrt((p.index + .5) / p.count) * best.pitch * .6 * Math.sqrt(p.count);
    placeIsland();
  }

  // On the way to their groups the people pass through the shape of
  // Lampedusa, the island these records are measured from: its outline, the
  // one the record opens on, filled with a dot for each of them. The dot
  // bound for the left of the groups takes a place on the left of the
  // island, so as the island comes apart the paths run side by side
  // rather than across one another.
  const outline = new Path2D(document.querySelector('#island-asset path').getAttribute('d'));
  const OUTLINE_W = 149, OUTLINE_H = 51;
  const probe = document.createElement('canvas').getContext('2d');
  let islandR = 3;
  function hexInside(step) {
    const pts = [];
    for (let row = 0, y = step / 2; y < OUTLINE_H; row++, y += step * .866) {
      for (let x = (row % 2 ? step : step / 2); x < OUTLINE_W; x += step) {
        if (probe.isPointInPath(outline, x, y)) pts.push({ x, y });
      }
    }
    return pts;
  }
  function placeIsland() {
    const n = people.length;
    let lo = .5, hi = 8;                       // the widest spacing that still holds n
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (hexInside(m).length >= n) lo = m; else hi = m; }
    const all = hexInside(lo);
    const pts = Array.from({ length: n }, (_, k) => all[Math.floor(k * all.length / n)]);
    const w = Math.min(width * .78, height * .5 * OUTLINE_W / OUTLINE_H);
    const scale = w / OUTLINE_W, x0 = width / 2 - w / 2, y0 = height / 2 - OUTLINE_H * scale / 2;
    islandR = Math.min(radius, lo * scale * .4);
    pts.sort((a, b) => a.x - b.x || a.y - b.y);
    const byTarget = [...people].sort((a, b) => a.tx - b.tx || a.ty - b.ty);
    byTarget.forEach((p, k) => {
      p.ix = x0 + pts[k].x * scale; p.iy = y0 + pts[k].y * scale;
      p.sweep = k / n;                         // left to right across the island
      p.bend = Math.sin(p.order * 9173.13 + p.index * 3.7);   // -1 to 1, fixed per person
    });
  }

  // A quadratic curve from a to b, bowed off the straight line by `bow`,
  // a share of the distance: positive to one side, negative to the other.
  function arc(ax, ay, bx, by, bow, t) {
    const dx = bx - ax, dy = by - ay;
    const cx = (ax + bx) / 2 - dy * bow, cy = (ay + by) / 2 + dx * bow;
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
  }

  function readSources() {
    const stageBox = stage.getBoundingClientRect();
    const sources = new Map();
    grid.querySelectorAll('[data-record-id]').forEach(el => {
      const svg = el.ownerSVGElement, box = svg.getBoundingClientRect();
      const scale = box.width / svg.viewBox.baseVal.width;
      sources.set(el.dataset.recordId, {
        x: box.left - stageBox.left + Number(el.getAttribute('cx')) * scale,
        y: box.top - stageBox.top + Number(el.getAttribute('cy')) * scale,
        r: Number(el.dataset.markRadius) * scale,
      });
    });
    return sources;
  }

  function draw() {
    frame = null;
    if (!width || !height) return;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const progress = clamp((top - track.getBoundingClientRect().top) / Math.max(1, track.offsetHeight - stage.offsetHeight));
    let handed = progress > HAND;
    const sources = handed ? readSources() : null;
    // Until every disc has drawn its marks, the SVG stays as it is.
    if (handed && sources.size !== rows.length) handed = false;
    // Reduced motion goes straight from the discs to the groups.
    const at = step => (reducedMotion ? (handed ? 1 : 0) : phase(progress, step));
    const [fade, gather, split, labels] = [FADE, GATHER, SPLIT, LABELS].map(at);
    // The two long moves unscaled, so each dot can take its own part of them.
    const raw = ([from, len]) => (reducedMotion ? (handed ? 1 : 0) : clamp((progress - from) / len));
    const toIsland = raw(ISLAND), toGroups = raw(SORT);

    // The discs stop answering the pointer as soon as they start to go.
    grid.classList.toggle('is-handed', handed);
    grid.style.opacity = handed ? 1 - fade : 1;
    grid.inert = handed;
    if (handed) { d3.select('#tooltip').style('opacity', 0); settleDiscs(); }
    caption.style.opacity = at(CAPTION);
    note.style.opacity = labels;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!handed) return;

    ctx.globalAlpha = MARK_ALPHA;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    for (const p of people) {
      const s = sources.get(p.recordId);
      // The record's centre closes on the middle of the stage...
      const gx = mix(s.x, centre.x + (s.x - centre.x) * GATHER_TO, gather);
      const gy = mix(s.y, centre.y + (s.y - centre.y) * GATHER_TO, gather);
      // ...while its mark splits into its people, each of them one size.
      const angle = p.index * 2.399963229728653;
      const x0 = gx + Math.cos(angle) * p.spread * split;
      const y0 = gy + Math.sin(angle) * p.spread * split;
      // Into the island, the left of it first, each along its own curve;
      // then out of it to the groups, in the same order.
      const ti = ease((toIsland - p.sweep * STAGGER) / (1 - STAGGER));
      const tg = ease((toGroups - p.sweep * STAGGER) / (1 - STAGGER));
      let [x, y] = ti < 1 ? arc(x0, y0, p.ix, p.iy, BEND * p.bend, ti) : [p.ix, p.iy];
      if (tg > 0) [x, y] = arc(p.ix, p.iy, p.tx, p.ty, FLOW, tg);
      if (reducedMotion) [x, y] = [p.tx, p.ty];
      const r = tg > 0 ? mix(islandR, radius, tg) : mix(mix(s.r, radius, split), islandR, ti);
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // Each label: the cause, in yellow, with its count after it in the
    // figures' grey.
    ctx.globalAlpha = labels;
    ctx.textBaseline = 'top';
    for (const g of groups) {
      g.lines.forEach((line, k) => {
        const y = g.y + k * LINE_H, split = line.lastIndexOf('  ');
        ctx.font = labelFont(500); ctx.fillStyle = CAUSE_COLOUR;
        if (k < g.lines.length - 1 || split < 0) { ctx.fillText(line, g.x, y); return; }
        const name = line.slice(0, split);
        ctx.fillText(name, g.x, y);
        const nx = g.x + ctx.measureText(`${name}  `).width;
        ctx.font = labelFont(400); ctx.fillStyle = 'rgba(255,255,255,.62)';
        ctx.fillText(line.slice(split + 2), nx, y);
      });
    }
    ctx.globalAlpha = 1;
  }
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(draw); };
  const resize = () => { layout(); schedule(); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('scenechange', schedule);
  new MutationObserver(schedule).observe(grid, { childList: true, subtree: true });
  if (document.fonts) document.fonts.ready.then(resize);
  resize();
}

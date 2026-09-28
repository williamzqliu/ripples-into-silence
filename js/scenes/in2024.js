// The existing entry point now joins the twelve annual discs to the people
// behind them. Source positions come from the actual SVG marks, not a replica.
import { CAUSES, expandPeople } from '../data/people.js';
import { reducedMotion } from '../core/motion.js';
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

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
  caption.querySelector('[data-people-count]').textContent = people.length.toLocaleString('en-US');
  const groups = CAUSES.map(c => ({ ...c, people: people.filter(p => p.cause === c.key) })).filter(g => g.people.length);
  const summary = stage.querySelector('.people-accessible');
  summary.textContent = groups.map(g => `${g.label}: ${g.people.length}`).join('. ') + '. Each dot represents one person recorded dead or missing, grouped by the cause reported for their record.';
  let width = 0, height = 0, dpr = 1, radius = 3, blocks = [], frame = null;

  function layout() {
    width = stage.clientWidth; height = stage.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    // A large first group and six smaller groups share two columns. The
    // same pitch and radius apply to every person, including the small groups.
    const pad = 24, gap = 36, top = 138, bottom = 62;
    const leftW = (width - pad * 2 - gap) * .58;
    const rightW = width - pad * 2 - gap - leftW;
    let pitch = 15;
    const measure = (list, w) => list.reduce((sum, g) => sum + 36 + Math.ceil(g.people.length / Math.max(1, Math.floor(w / pitch))) * pitch + 16, 0);
    while (pitch > 4 && Math.max(measure(groups.slice(0, 1), leftW), measure(groups.slice(1), rightW)) > height - top - bottom) pitch -= .25;
    radius = pitch * .31;
    blocks = [];
    for (const [list, x, w] of [[groups.slice(0, 1), pad, leftW], [groups.slice(1), pad + leftW + gap, rightW]]) {
      let y = top;
      const cols = Math.max(1, Math.floor(w / pitch));
      for (const group of list) {
        blocks.push({ ...group, x, y, w });
        group.people.forEach((p, i) => {
          p.tx = x + radius + (i % cols) * pitch;
          p.ty = y + 36 + radius + Math.floor(i / cols) * pitch;
        });
        y += 36 + Math.ceil(group.people.length / cols) * pitch + 16;
      }
    }
  }

  function draw() {
    frame = null;
    if (!width || !height) return;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const progress = clamp((top - track.getBoundingClientRect().top) / Math.max(1, track.offsetHeight - stage.offsetHeight));
    const transfer = ease((progress - .12) / .1);
    const split = ease((progress - .23) / .24);
    const sort = ease((progress - .38) / .4);
    const labels = ease((progress - .78) / .09);
    const reduced = reducedMotion && progress > .2;
    grid.style.opacity = reduced ? 0 : 1 - transfer;
    grid.style.pointerEvents = progress < .14 ? '' : 'none';
    grid.inert = progress >= .14;
    if (progress >= .14) d3.select('#tooltip').style('opacity', 0);
    caption.style.opacity = reduced ? 1 : ease((progress - .25) / .15);
    note.style.opacity = reduced ? 1 : labels;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (progress <= .12) return;
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
    // While the SVG data is loading, leave the source diagram visible.
    if (sources.size !== rows.length) { grid.style.opacity = 1; return; }
    if (!reduced) {
      ctx.globalAlpha = transfer * (1 - split);
      ctx.fillStyle = '#fff';
      for (const source of sources.values()) {
        ctx.beginPath(); ctx.arc(source.x, source.y, source.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = reduced ? 1 : split;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    for (const p of people) {
      const source = sources.get(p.recordId);
      const angle = p.index * 2.399963229728653;
      const spread = Math.sqrt((p.index + .5) / p.count) * Math.max(source.r * 2, 14);
      const sx = source.x + Math.cos(angle) * spread * split;
      const sy = source.y + Math.sin(angle) * spread * split;
      const t = reduced ? 1 : sort;
      const x = mix(sx, p.tx, t), y = mix(sy, p.ty, t);
      ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = reduced ? 1 : labels;
    ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
    for (const b of blocks) {
      const words = `${b.people.length}  ${b.label}`.split(' ');
      let line = '', y = b.y;
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > b.w) { ctx.fillText(line, b.x, y); y += 17; line = word; }
        else line = next;
      }
      ctx.fillText(line, b.x, y);
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

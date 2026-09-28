const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// A map pin, drawn in the text's colour, before the place.
const PIN = '<svg class="tip-pin" viewBox="0 0 12 16" aria-hidden="true">' +
  '<path d="M6 15s5-5.2 5-8.8A5 5 0 0 0 1 6.2C1 9.8 6 15 6 15Z" fill="none" stroke="currentColor" stroke-width="1.3"/>' +
  '<circle cx="6" cy="6.2" r="1.7" fill="currentColor"/></svg>';
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = iso => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// The count first and largest, then when and how far, then the place as the
// source describes it. The record's ID meant nothing to a reader, and the
// review notes on four coordinates made the panel a paragraph; both stay in
// the downloadable sample and the method notes.
export function recordTooltip(d) {
  return `<div class="tip-count">${d.dead} dead or missing</div>` +
    `<div class="tip-meta">${escape(day(d.date))} · ${d.distance.toFixed(1)} km from Lampedusa</div>` +
    `<div class="tip-place">${PIN}<span>${escape(d.location)}</span></div>`;
}

// Shows the shared tooltip beside the pointer, kept inside the window. A long
// source note near the right or bottom edge flips it to the other side of
// the pointer rather than running off screen.
export function showTooltip(event, html) {
  const tip = document.getElementById("tooltip");
  tip.innerHTML = html;
  const w = tip.offsetWidth, h = tip.offsetHeight, m = 8;
  let x = event.clientX + 12, y = event.clientY - 20;
  if (x + w > innerWidth - m) x = event.clientX - w - 12;
  y = Math.min(Math.max(y, m), innerHeight - h - m);
  tip.style.left = `${Math.max(m, x) + scrollX}px`;
  tip.style.top = `${y + scrollY}px`;
  tip.style.opacity = 1;
}

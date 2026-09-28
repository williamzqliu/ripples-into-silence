const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function recordTooltip(d) {
  return `${escape(d.date)} · ${escape(d.id)}<br>${d.dead} dead or missing<br>` +
    `Recorded coordinate: ${d.distance.toFixed(1)} km from the reference point<br>` +
    `${escape(d.location)}${d.note ? `<br><strong>Source note:</strong> ${escape(d.note)}` : ""}`;
}

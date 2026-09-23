// js/sequence/rippleBackground.js
//
// The ambient field behind the cover and the intro. Each ripple opens, holds
// and goes; what matters here is that it goes. Every one of these used to be
// permanent: nothing called remove, and the inner ring's transition finished
// at opacity 0.15 rather than at zero, so the cover silted up into a solid
// mat of rings at about three a second, and every one of them stayed in the
// document being composited.

import {
  RIPPLE_INNER_STROKE,
  RIPPLE_OUTER_OPA_ORG,
  RIPPLE_OUTER_FADING_DURATION,
  RIPPLE_OUTER_ENLARGE,
  BG_MAX_LIVE,
  BG_TICK_MIN,
  BG_TICK_MAX,
} from "../config.js";

export function startRippleBackground(containerId) {
  const container = d3.select(containerId);
  const host = document.querySelector(containerId);
  if (!host) return;

  const svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .style("position", "absolute")
    .style("top", 0)
    .style("left", 0)
    .style("z-index", 0)
    .style("pointer-events", "none")
    .style("overflow", "visible");

  let scrollY = 0;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; },
    { passive: true });

  let live = 0;

  function createRipple(fadeSpeed = 1.0) {
    if (live >= BG_MAX_LIVE) return;
    live++;

    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const r = 10 + Math.random() * 20;

    const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

    const fadeIn = 400 * fadeSpeed + Math.random() * 400 * fadeSpeed;
    const fadeOut = RIPPLE_OUTER_FADING_DURATION * (0.8 + Math.random() * 0.5) * fadeSpeed;

    // The ring. It used to stop here, at 0.15, and stay for the session.
    g.append("circle")
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", RIPPLE_INNER_STROKE + ((Math.random() - 0.5) * 0.5))
      .attr("opacity", 0)
      .transition()
      .duration(fadeIn)
      .attr("r", r)
      .attr("opacity", 0.15)
      .transition()
      .delay(200)
      .duration(fadeOut)
      .attr("r", r * 1.6)
      .attr("opacity", 0);

    const outer = g.append("circle")
      .attr("r", 0)
      .attr("fill", "white")
      .attr("opacity", 0);

    outer.transition()
      .duration(fadeIn)
      .attr("r", r)
      .attr("opacity", RIPPLE_OUTER_OPA_ORG)
      .transition()
      .delay(200)
      .duration(fadeOut)
      .attr("r", r * RIPPLE_OUTER_ENLARGE)
      .attr("opacity", 0)
      .tween("blur", () => t => outer.style("filter", `blur(${(t * 4).toFixed(2)}px)`))
      .on("end", () => { g.remove(); live--; })
      .on("interrupt", () => { g.remove(); live--; });
  }

  // main.js puts `hidden` on this layer once the cover and the intro are both
  // off screen. Drawing into something nobody can see is the other half of
  // the cost, so the loop stands down until it comes back.
  function showing() {
    return !document.hidden && !host.classList.contains("hidden");
  }

  function tick() {
    if (!showing()) {
      setTimeout(tick, 600);
      return;
    }

    const intro = document.getElementById("intro");
    const screenH = window.innerHeight;
    const linear = intro
      ? Math.min(1, Math.max(0, (scrollY - intro.offsetTop + screenH * 0.3) / intro.offsetHeight))
      : 0;
    const percent = 1 / (1 + Math.exp(-8 * (linear - 0.5)));

    const rippleDensity = 1 + percent * 4;
    const fadeMultiplier = 1.2 - percent * 0.5;
    const count = Math.floor(rippleDensity + Math.random() * rippleDensity);

    for (let i = 0; i < count; i++) createRipple(fadeMultiplier);

    setTimeout(tick, BG_TICK_MIN + Math.random() * (BG_TICK_MAX - BG_TICK_MIN));
  }

  // A plain timer. The rAF this used to sit inside bought nothing, and it
  // stalls wherever the browser throttles frames.
  tick();
}

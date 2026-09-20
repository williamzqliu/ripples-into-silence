import {
    FRAME_WIDTH, FRAME_HEIGHT,
    RIPPLE_INNER_STROKE, RIPPLE_TRANS_DURATION,
    RIPPLE_OUTER_OPA_ORG, RIPPLE_SHOWING,
    RIPPLE_OUTER_FADING_DURATION, RIPPLE_OUTER_ENLARGE
  } from "../config.js";
  
  export function startRippleBackground(containerId) {
    const container = d3.select(containerId);
    const svg = container.append("svg")
      .attr("width", FRAME_WIDTH)
      .attr("height", FRAME_HEIGHT)
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("z-index", 0)
      .style("pointer-events", "none")
      .style("overflow", "visible");
  
    let scrollY = 0;
    window.addEventListener("scroll", () => {
      scrollY = window.scrollY;
    });
  
    function createRipple(fadeSpeed = 1.0) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const r = 10 + Math.random() * 20;
  
      const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);
  
      const fadeIn = 400 * fadeSpeed + Math.random() * 400 * fadeSpeed;
      const fadeOut = RIPPLE_OUTER_FADING_DURATION * (0.8 + Math.random() * 0.5) * fadeSpeed;
  
      const inner = g.append("circle")
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", RIPPLE_INNER_STROKE + ((Math.random() - 0.5) * 0.5)) // vary the weight by a quarter pixel either way
        .attr("opacity", 0);
  
      inner.transition()
        .duration(fadeIn)
        .attr("r", r)
        .attr("opacity", 0.15);
  
      const outer = g.append("circle")
        .attr("r", 0)
        .attr("fill", "white")
        .attr("opacity", 0);
  
      outer.transition()
        .duration(fadeIn)
        .attr("r", r)
        .attr("opacity", RIPPLE_OUTER_OPA_ORG)
        .transition()
        .delay(200) // hold
        .duration(fadeOut)
        .attr("r", r * RIPPLE_OUTER_ENLARGE)
        .attr("opacity", 0)
        .tween("blur", () => t => outer.style("filter", `blur(${(t * 4).toFixed(2)}px)`));
    }
  
    function adaptiveRippleLoop() {
      const intro = document.getElementById("intro");
      const introTop = intro.offsetTop;
      const introHeight = intro.offsetHeight;
      const screenH = window.innerHeight;
  
      const linear = Math.min(1, Math.max(0, (scrollY - introTop + screenH * 0.3) / introHeight));
      const percent = 1 / (1 + Math.exp(-8 * (linear - 0.5)));  // sigmoid, so the ends ease and the middle moves
  
      const rippleDensity = 1 + percent * 4;
      const fadeMultiplier = 1.2 - percent * 0.5;
  
      const count = Math.floor(rippleDensity + Math.random() * rippleDensity);
  
      for (let i = 0; i < count; i++) createRipple(fadeMultiplier);
  
      const nextDelay = 300 + Math.random() * 500;
      setTimeout(() => requestAnimationFrame(adaptiveRippleLoop), nextDelay);
    }
  
    adaptiveRippleLoop();
  }
  
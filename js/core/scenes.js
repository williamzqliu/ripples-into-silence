// js/core/scenes.js
//
// The page is six scenes, and only one of them is on screen at a time. Each
// used to scroll in under the last, so the next section's heading came up
// the screen while the reader was still in the one before. Now a scene is
// hidden until its top edge comes up past FADE_FROM of the screen, and
// between there and FADE_TO it crossfades with the scene before it, the
// two opacities always summing to one. The fade is scrubbed by the scroll,
// not played on a timer: stop half way and it holds half way, scroll back
// and it runs backwards.
//
// The scene that leads carries no class; the others carry .scene--away.
// A `scenechange` event goes out on window whenever the lead changes, and
// entrances inside a scene wait for it: a paragraph that floats in, or a
// disc that plays, while its scene is still transparent has finished
// before anyone could see it.

export const FADE_FROM = 0.65;
export const FADE_TO = 0.25;

const SCENE_IDS = ["ripple-bg-wrapper", "sequence", "context", "eleven-years", "year-2024", "epilogue"];

let scenes = [];
let currentScene = -1;

function updateScenes() {
  const vh = window.innerHeight;
  const arrived = scenes.map((scene, i) => {
    if (i === 0) return 1;
    const top = scene.getBoundingClientRect().top;
    return Math.min(Math.max((vh * FADE_FROM - top) / (vh * (FADE_FROM - FADE_TO)), 0), 1);
  });

  let lead = 0, leadOpacity = -1;
  // What fades is a scene's content, never its ground. Fading the whole
  // section faded its opaque background with it, and a scene waiting to
  // come in was then a transparent hole straight through to the ripple
  // field, which is fixed behind the whole page: ripples showed under the
  // nav, where the record would be, brighter than in the intro itself.
  const opacity = scenes.map((scene, i) => {
    const o = arrived[i] * (1 - (arrived[i + 1] || 0));
    for (const child of scene.children) child.style.opacity = o.toFixed(3);
    if (o > leadOpacity) { leadOpacity = o; lead = i; }
    return o;
  });

  // The ripple field is fixed to the viewport, outside the first scene, so
  // it does not fade with it on its own. It used to stay at full strength
  // until the cover and the intro were entirely off the screen, and with
  // the next scene translucent through its crossfade the ripples showed
  // through the record. It is the first scene's now, at the first scene's
  // opacity, and its loop stands down once that is zero.
  const ripples = document.getElementById("ripple-background");
  if (ripples) {
    ripples.style.opacity = opacity[0].toFixed(3);
    ripples.classList.toggle("hidden", opacity[0] < 0.01);
  }

  if (lead !== currentScene) {
    currentScene = lead;
    scenes.forEach((scene, i) => scene.classList.toggle("scene--away", i !== lead));
    window.dispatchEvent(new Event("scenechange"));
  }
}

// Registered before any other scene's scroll handler that reads
// .scene--away, so they all see this scroll's lead.
export function initScenes() {
  scenes = SCENE_IDS.map(id => document.getElementById(id)).filter(Boolean);
  window.addEventListener("scroll", updateScenes, { passive: true });
  window.addEventListener("resize", updateScenes);
}

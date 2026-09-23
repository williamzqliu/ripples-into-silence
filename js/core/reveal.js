// js/core/reveal.js
//
// .fade-step: the one float-in for prose outside the pinned sections.
// Each comes up as it rises past 95% of the screen, once its scene leads.

function reveal() {
  const vh = window.innerHeight;
  document.querySelectorAll(".fade-step:not(.visible)").forEach(step => {
    // The stagger counts within a group, not down the whole page: numbered
    // globally, the ending's paragraphs would have waited on Eleven Years'.
    const i = [...step.parentElement.children]
      .filter(c => c.classList.contains("fade-step")).indexOf(step);
    if (step.getBoundingClientRect().top < vh * 0.95 - i * 15 &&
        !step.closest(".scene--away")) {
      step.classList.add("visible");
    }
  });
}

export function initReveal() {
  window.addEventListener("scroll", reveal, { passive: true });
}

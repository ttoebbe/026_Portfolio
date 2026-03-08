const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Initializes reveal animations.
 */
export function initRevealObserver() {
  const revealElements = document.querySelectorAll(".reveal");
  if (revealElements.length === 0) {
    return;
  }
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealAll(revealElements);
    return;
  }
  const observer = createRevealObserver();
  revealElements.forEach((element) => observer.observe(element));
}

/**
 * Creates reveal observer.
 */
function createRevealObserver() {
  return new IntersectionObserver(onRevealEntries, { threshold: 0.16 });
}

/**
 * Handles reveal observer entries.
 */
function onRevealEntries(entries, observer) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }
    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
  });
}

/**
 * Makes all reveal elements visible.
 */
function revealAll(elements) {
  elements.forEach((element) => element.classList.add("visible"));
}

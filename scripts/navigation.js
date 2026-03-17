import { getTranslation } from "./language.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Initializes mobile menu interactions.
 */
export function initMobileMenu() {
  const elements = getMobileMenuElements();
  if (!elements.menuToggle || !elements.panel || !elements.backdrop) {
    return;
  }
  bindMobileMenuToggle(elements.menuToggle);
  bindMobileMenuBackdrop(elements.backdrop);
  bindMobileMenuLinks(elements.panel);
  bindMobileMenuGlobalEvents();
  setMobileMenuState(false);
}

/**
 * Returns menu related DOM elements.
 */
function getMobileMenuElements() {
  return {
    menuToggle: document.getElementById("menu-toggle"),
    panel: document.getElementById("mobile-nav-panel"),
    backdrop: document.getElementById("mobile-nav-backdrop")
  };
}

/**
 * Binds menu toggle click.
 */
function bindMobileMenuToggle(menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    setMobileMenuState(!isExpanded);
  });
}

/**
 * Binds backdrop click to close menu.
 */
function bindMobileMenuBackdrop(backdrop) {
  backdrop.addEventListener("click", closeMobileMenu);
}

/**
 * Closes mobile menu on navigation link click.
 */
function bindMobileMenuLinks(panel) {
  panel.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });
}

/**
 * Binds global events for menu close behavior.
 */
function bindMobileMenuGlobalEvents() {
  document.addEventListener("keydown", onMobileMenuKeydown);
  window.addEventListener("resize", onViewportResize);
}

/**
 * Handles keyboard events for menu.
 */
function onMobileMenuKeydown(event) {
  if (event.key === "Escape") {
    closeMobileMenu();
  }
}

/**
 * Closes mobile menu when leaving mobile viewport.
 */
function onViewportResize() {
  if (window.innerWidth > 940) {
    closeMobileMenu();
  }
}

/**
 * Closes mobile menu.
 */
function closeMobileMenu() {
  setMobileMenuState(false);
}

/**
 * Updates menu state and visual classes.
 */
function setMobileMenuState(isOpen) {
  const elements = getMobileMenuElements();
  if (!elements.menuToggle || !elements.panel || !elements.backdrop) {
    return;
  }
  elements.menuToggle.classList.toggle("is-open", isOpen);
  elements.panel.classList.toggle("is-open", isOpen);
  elements.backdrop.classList.toggle("is-open", isOpen);
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  elements.backdrop.hidden = !isOpen;
  document.body.classList.toggle("menu-open", isOpen);
  setMobileMenuToggleLabel(elements.menuToggle, isOpen);
}

/**
 * Sets localized menu toggle label.
 */
function setMobileMenuToggleLabel(menuToggle, isOpen) {
  const key = isOpen ? "nav.menu.close" : "nav.menu.open";
  const label = getTranslation(key);
  menuToggle.setAttribute("aria-label", label);
  menuToggle.setAttribute("title", label);
}

/**
 * Enables smooth scrolling for internal links.
 */
export function initSmoothScroll() {
  const header = document.querySelector(".site-header");
  document.querySelectorAll('a[href^="#"]').forEach((link) => bindSmoothLink(link, header));
}

/**
 * Binds smooth scroll for one link.
 */
function bindSmoothLink(link, header) {
  const hash = link.getAttribute("href");
  const target = getScrollTarget(hash);
  if (!target) {
    return;
  }
  link.addEventListener("click", (event) => onSmoothScroll(event, target, hash, header));
}

/**
 * Resolves target element for a hash.
 */
function getScrollTarget(hash) {
  if (!hash || hash.length < 2) {
    return null;
  }
  return document.querySelector(hash);
}

/**
 * Handles smooth scrolling behavior.
 */
function onSmoothScroll(event, target, hash, header) {
  event.preventDefault();
  const behavior = prefersReducedMotion ? "auto" : "smooth";
  if (hash === "#top") {
    scrollToAbsoluteTop(behavior);
  } else {
    const top = getScrollTop(target, header);
    window.scrollTo({ top, behavior });
  }
  history.replaceState(null, "", hash);
}

/**
 * Scrolls to the absolute document start.
 */
function scrollToAbsoluteTop(behavior) {
  window.scrollTo({ top: 0, behavior });
  if (behavior === "smooth") {
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 450);
  }
}

/**
 * Calculates target top with header offset.
 */
function getScrollTop(target, header) {
  const headerOffset = header ? header.offsetHeight + 12 : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  return Math.max(0, targetTop);
}

/**
 * Initializes active main navigation state.
 */
export function initActiveNavigation() {
  const navLinks = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
  const observedSections = getObservedSections(navLinks);
  if (!("IntersectionObserver" in window) || observedSections.length === 0) {
    return;
  }
  const observer = createNavigationObserver(navLinks, observedSections);
  observedSections.forEach((item) => observer.observe(item.section));
}

/**
 * Returns nav links with matching sections.
 */
function getObservedSections(navLinks) {
  return navLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter((item) => Boolean(item.section));
}

/**
 * Creates observer for active navigation updates.
 */
function createNavigationObserver(navLinks, observedSections) {
  const options = { rootMargin: "-45% 0px -45% 0px", threshold: 0 };
  return new IntersectionObserver((entries) => {
    onNavigationEntries(entries, navLinks, observedSections);
  }, options);
}

/**
 * Handles intersection updates for navigation.
 */
function onNavigationEntries(entries, navLinks, observedSections) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }
    const match = observedSections.find((item) => item.section === entry.target);
    if (match) {
      setActiveLink(navLinks, match.link);
    }
  });
}

/**
 * Activates one nav link and clears others.
 */
function setActiveLink(navLinks, activeLink) {
  navLinks.forEach((link) => link.classList.remove("active"));
  activeLink.classList.add("active");
}

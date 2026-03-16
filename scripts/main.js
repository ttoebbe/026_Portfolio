import { getTranslation, applyTranslations, initLanguageSwitch } from "./language.js";
import { initMobileMenu, initSmoothScroll, initActiveNavigation } from "./navigation.js";
import { initRevealObserver } from "./reveal.js";
import { initContactForm } from "./contact-form.js";

const portfolioConfig = window.PORTFOLIO_CONFIG || {};

/**
 * Applies configured contact links.
 */
function applyContactConfig() {
  const email = portfolioConfig.contact?.email || "your@email.com";
  const phone = portfolioConfig.contact?.phone || "+49 123 456789";
  updateContactLink("contact-email", email, "mailto", String);
  updateContactLink("contact-phone", phone, "tel", normalizePhone);
}

/**
 * Updates one contact link by id.
 */
function updateContactLink(elementId, value, protocol, transformer) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }
  element.textContent = value;
  element.setAttribute("href", `${protocol}:${transformer(value)}`);
}

/**
 * Normalizes phone string for tel links.
 */
function normalizePhone(phone) {
  return String(phone).replace(/[^+\d]/g, "");
}

/**
 * Initializes all UI features.
 */
function init() {
  applyContactConfig();
  applyTranslations();
  initMobileMenu();
  initLanguageSwitch();
  initSmoothScroll();
  initActiveNavigation();
  initRevealObserver();
  initContactForm();
}

document.addEventListener("DOMContentLoaded", init);

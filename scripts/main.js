"use strict";

const DEFAULT_LANGUAGE = "de";
const LANGUAGE_STORAGE_KEY = "portfolio_lang";
const SUPPORTED_LANGUAGES = ["de", "en"];
const translationTables = window.PORTFOLIO_TRANSLATIONS || {};
const portfolioConfig = window.PORTFOLIO_CONFIG || {};
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentLanguage = getInitialLanguage();

/**
 * Returns startup language from localStorage.
 */
function getInitialLanguage() {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch (_error) {
    return DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Returns translated value for a key.
 */
function getTranslation(key) {
  const currentTable = translationTables[currentLanguage] || {};
  const fallbackTable = translationTables[DEFAULT_LANGUAGE] || {};
  const translated = currentTable[key] || fallbackTable[key];
  const textValue = typeof translated === "string" ? translated : key;
  return textValue.replace("{{year}}", String(new Date().getFullYear()));
}

/**
 * Applies all translation texts and button states.
 */
function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-translation]").forEach(applyTranslationToElement);
  document.querySelectorAll(".lang-btn").forEach(setLanguageButtonState);
  syncMobileMenuToggleLabel();
}

/**
 * Applies translation to one element.
 */
function applyTranslationToElement(element) {
  const key = element.getAttribute("data-translation");
  const translatedText = getTranslation(key);
  const attributes = element.getAttribute("data-translation-attr");
  if (!attributes) {
    element.textContent = translatedText;
    return;
  }
  setTranslatedAttributes(element, attributes, translatedText);
}

/**
 * Sets translated value for attribute list.
 */
function setTranslatedAttributes(element, attributes, value) {
  attributes
    .split(",")
    .map((attribute) => attribute.trim())
    .filter(Boolean)
    .forEach((attribute) => element.setAttribute(attribute, value));
}

/**
 * Updates one language button state.
 */
function setLanguageButtonState(button) {
  const isActive = button.dataset.lang === currentLanguage;
  button.classList.toggle("active", isActive);
  button.setAttribute("aria-pressed", String(isActive));
}

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
 * Registers language switch listeners.
 */
function initLanguageSwitch() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", onLanguageButtonClick);
  });
}

/**
 * Initializes mobile menu interactions.
 */
function initMobileMenu() {
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
 * Syncs menu toggle label after language change.
 */
function syncMobileMenuToggleLabel() {
  const { menuToggle } = getMobileMenuElements();
  if (!menuToggle) {
    return;
  }
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  setMobileMenuToggleLabel(menuToggle, isOpen);
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
 * Handles language switch click.
 */
function onLanguageButtonClick(event) {
  const button = event.currentTarget;
  const nextLanguage = button?.dataset?.lang;
  if (!SUPPORTED_LANGUAGES.includes(nextLanguage) || nextLanguage === currentLanguage) {
    return;
  }
  currentLanguage = nextLanguage;
  saveLanguage(currentLanguage);
  applyTranslations();
}

/**
 * Saves language to localStorage.
 */
function saveLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (_error) {
    return;
  }
}

/**
 * Enables smooth scrolling for internal links.
 */
function initSmoothScroll() {
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
  const top = getScrollTop(target, header);
  const behavior = prefersReducedMotion ? "auto" : "smooth";
  window.scrollTo({ top, behavior });
  history.replaceState(null, "", hash);
}

/**
 * Calculates target top with header offset.
 */
function getScrollTop(target, header) {
  const headerOffset = header ? header.offsetHeight + 12 : 0;
  return target.getBoundingClientRect().top + window.scrollY - headerOffset;
}

/**
 * Initializes active main navigation state.
 */
function initActiveNavigation() {
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
    .map((link) => ({ link, section: getScrollTarget(link.getAttribute("href")) }))
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

/**
 * Initializes reveal animations.
 */
function initRevealObserver() {
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

/**
 * Sets form feedback status.
 */
function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

/**
 * Initializes contact form submit handling.
 */
function initContactForm() {
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("submit-btn");
  const statusElement = document.getElementById("form-status");
  if (!form || !submitButton || !statusElement) {
    return;
  }
  form.addEventListener("submit", (event) => {
    onContactSubmit(event, form, submitButton, statusElement);
  });
}

/**
 * Handles contact form submission.
 */
async function onContactSubmit(event, form, submitButton, statusElement) {
  event.preventDefault();
  const payload = buildPayload(new FormData(form));
  const endpoint = getEndpoint();
  if (!validatePayload(payload, statusElement)) {
    return;
  }
  if (!validateEndpoint(endpoint, statusElement)) {
    return;
  }
  await submitContact(form, submitButton, statusElement, endpoint, payload);
}

/**
 * Builds payload from form fields.
 */
function buildPayload(formData) {
  return {
    name: getInputValue(formData, "name"),
    email: getInputValue(formData, "email"),
    message: getInputValue(formData, "message"),
    privacyAccepted: formData.get("privacy-accepted") === "on",
    language: currentLanguage
  };
}

/**
 * Returns trimmed string value from form data.
 */
function getInputValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

/**
 * Validates payload fields and email format.
 */
function validatePayload(payload, statusElement) {
  if (!hasRequiredFields(payload)) {
    setStatus(statusElement, getTranslation("form.status.required"), "error");
    return false;
  }
  if (!hasValidEmail(payload.email)) {
    setStatus(statusElement, getTranslation("form.status.invalidEmail"), "error");
    return false;
  }
  return true;
}

/**
 * Checks all required payload values.
 */
function hasRequiredFields(payload) {
  return Boolean(payload.name && payload.email && payload.message && payload.privacyAccepted);
}

/**
 * Validates e-mail pattern.
 */
function hasValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Reads endpoint from runtime config.
 */
function getEndpoint() {
  return String(portfolioConfig.form?.endpoint || "").trim();
}

/**
 * Validates configured endpoint.
 */
function validateEndpoint(endpoint, statusElement) {
  if (endpoint && !endpoint.includes("example.invalid")) {
    return true;
  }
  setStatus(statusElement, getTranslation("form.status.endpoint"), "error");
  return false;
}

/**
 * Sends contact request and updates UI state.
 */
async function submitContact(form, submitButton, statusElement, endpoint, payload) {
  const method = getRequestMethod();
  const sendFormat = getSendFormat();
  const requestOptions = buildRequestOptions(payload, method, sendFormat);
  setSubmitDisabled(submitButton, true);
  setStatus(statusElement, getTranslation("form.status.sending"));
  try {
    await sendRequest(endpoint, requestOptions);
    onSubmitSuccess(form, statusElement);
  } catch (error) {
    onSubmitError(statusElement, error, endpoint, method);
  }
  setSubmitDisabled(submitButton, false);
}

/**
 * Returns configured HTTP method.
 */
function getRequestMethod() {
  return String(portfolioConfig.form?.method || "POST").toUpperCase();
}

/**
 * Returns configured payload format.
 */
function getSendFormat() {
  return String(portfolioConfig.form?.sendFormat || "json").toLowerCase();
}

/**
 * Builds fetch options object.
 */
function buildRequestOptions(payload, method, sendFormat) {
  const requestOptions = { method, headers: { Accept: "application/json" } };
  applyRequestBody(requestOptions, payload, method, sendFormat);
  return requestOptions;
}

/**
 * Applies request body for non-GET methods.
 */
function applyRequestBody(requestOptions, payload, method, sendFormat) {
  if (method === "GET") {
    return;
  }
  if (sendFormat === "json") {
    requestOptions.headers["Content-Type"] = "application/json";
    requestOptions.body = JSON.stringify(payload);
    return;
  }
  requestOptions.body = toSearchParams(payload);
}

/**
 * Converts payload to URL search params.
 */
function toSearchParams(payload) {
  return new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)]));
}

/**
 * Executes request and validates response.
 */
async function sendRequest(endpoint, requestOptions) {
  const response = await fetch(endpoint, requestOptions);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await safeParseJson(response) : null;
  if (!response.ok) {
    const apiError = isJson && data && typeof data.error === "string" ? data.error : "Request failed";
    const apiReason = isJson && data && typeof data.reason === "string" ? data.reason : "";
    const reasonSuffix = apiReason ? ` | reason: ${apiReason}` : "";
    throw new Error(`${apiError} (status ${response.status})${reasonSuffix}`);
  }
  if (isJson && data && data.success !== true) {
    throw new Error("Request failed: success flag missing");
  }
}

/**
 * Parses JSON safely and returns null on parse errors.
 */
async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

/**
 * Toggles submit button disabled state.
 */
function setSubmitDisabled(button, disabled) {
  button.disabled = disabled;
}

/**
 * Handles submit success state.
 */
function onSubmitSuccess(form, statusElement) {
  form.reset();
  setStatus(statusElement, getTranslation("form.status.success"), "success");
}

/**
 * Handles submit error state.
 */
function onSubmitError(statusElement, error, endpoint, method) {
  setStatus(statusElement, getTranslation("form.status.error"), "error");
  const reason = error instanceof Error ? error.message : String(error);
  console.error("[Contact Form] Send failed", {
    endpoint,
    method,
    reason
  });
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

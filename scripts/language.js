const DEFAULT_LANGUAGE = "de";
const LANGUAGE_STORAGE_KEY = "portfolio_lang";
const SUPPORTED_LANGUAGES = ["de", "en"];
const translationTables = window.PORTFOLIO_TRANSLATIONS || {};

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
export function getTranslation(key) {
  const currentTable = translationTables[currentLanguage] || {};
  const fallbackTable = translationTables[DEFAULT_LANGUAGE] || {};
  const translated = currentTable[key] || fallbackTable[key];
  const textValue = typeof translated === "string" ? translated : key;
  return textValue.replace("{{year}}", String(new Date().getFullYear()));
}

/**
 * Returns the active language code.
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Applies all translation texts and button states.
 */
export function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-translation]").forEach(applyTranslationToElement);
  document.querySelectorAll(".lang-btn").forEach(setLanguageButtonState);
  syncMenuToggleLabel();
}

/**
 * Updates mobile menu toggle label after language change.
 */
function syncMenuToggleLabel() {
  const menuToggle = document.getElementById("menu-toggle");
  if (!menuToggle) {
    return;
  }
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  const key = isOpen ? "nav.menu.close" : "nav.menu.open";
  const label = getTranslation(key);
  menuToggle.setAttribute("aria-label", label);
  menuToggle.setAttribute("title", label);
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
 * Registers language switch listeners.
 */
export function initLanguageSwitch() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", onLanguageButtonClick);
  });
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

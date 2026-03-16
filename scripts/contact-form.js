/**
 * Contact form UI interactions and orchestration.
 * Main module that coordinates validation, API, and DOM manipulation.
 */

import { getTranslation } from "./language.js";
import { 
  createValidationState, 
  getFieldError, 
  getFieldValue, 
  hasValidEmail, 
  hasNoValidationErrors, 
  isFormValid, 
  getFirstErrorKey, 
  resetValidationState, 
  FIELD_ORDER, 
  TEXT_FIELD_IDS 
} from "./contact-validation.js";
import { 
  buildPayload, 
  getEndpoint, 
  validateEndpoint, 
  submitContact 
} from "./contact-api.js";

/**
 * Sets form feedback status.
 */
export function setStatus(element, message, type) {
  element.textContent = message;
  element.classList.remove("error", "success");
  if (type) {
    element.classList.add(type);
  }
}

/**
 * Returns trimmed string value from form data.
 */
export function getInputValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

/**
 * Initializes contact form with persistent validation.
 */
export function initContactForm() {
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("submit-btn");
  const statusElement = document.getElementById("form-status");
  const validationState = createValidationState();
  if (!form || !submitButton || !statusElement) {
    return;
  }
  clearFieldStates();
  updateSubmitState(form, submitButton);
  addFieldValidationListeners(form, submitButton, statusElement, validationState);
  form.addEventListener("submit", (event) => {
    onContactSubmit(event, form, submitButton, statusElement, validationState);
  });
}

/**
 * Removes error/success classes from all fields.
 */
export function clearFieldStates() {
  document.querySelectorAll(".form-field").forEach((field) => {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
  });
  document.querySelectorAll(".consent-group").forEach((group) => {
    group.classList.remove("is-invalid");
  });
}

/**
 * Adds listeners for all form fields.
 */
function addFieldValidationListeners(form, submitButton, statusElement, validationState) {
  TEXT_FIELD_IDS.forEach((fieldId) => {
    addTextFieldListeners(form, fieldId, submitButton, statusElement, validationState);
  });
  addCheckboxListener(form, submitButton, statusElement, validationState);
}

/**
 * Adds blur and input listeners to text field.
 */
function addTextFieldListeners(form, fieldId, submitButton, statusElement, validationState) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.addEventListener("blur", () => {
    onFieldBlur(form, fieldId, submitButton, statusElement, validationState);
  });
  field.addEventListener("input", () => {
    onFieldInput(form, fieldId, submitButton, statusElement, validationState);
  });
}

/**
 * Adds change listener to privacy checkbox.
 */
function addCheckboxListener(form, submitButton, statusElement, validationState) {
  const field = document.getElementById("privacy-accepted");
  if (!field) return;
  field.addEventListener("change", () => {
    onFieldBlur(form, "privacy-accepted", submitButton, statusElement, validationState);
  });
}

/**
 * Handles field blur/change validation.
 */
function onFieldBlur(form, fieldId, submitButton, statusElement, validationState) {
  validateSingleField(form, fieldId, validationState, statusElement);
  updateSubmitState(form, submitButton);
}

/**
 * Handles field input for fields with errors.
 */
function onFieldInput(form, fieldId, submitButton, statusElement, validationState) {
  if (!validationState[fieldId]) return;
  validateSingleField(form, fieldId, validationState, statusElement);
  updateSubmitState(form, submitButton);
}

/**
 * Validates one field and re-renders status.
 */
function validateSingleField(form, fieldId, validationState, statusElement) {
  const errorKey = getFieldError(fieldId, new FormData(form));
  validationState[fieldId] = errorKey;
  applyFieldState(fieldId, errorKey);
  renderValidationStatus(statusElement, validationState);
  return !errorKey;
}

/**
 * Validates all form fields.
 */
function validateAllFields(form, validationState, statusElement) {
  const formData = new FormData(form);
  FIELD_ORDER.forEach((fieldId) => {
    validationState[fieldId] = getFieldError(fieldId, formData);
    applyFieldState(fieldId, validationState[fieldId]);
  });
  renderValidationStatus(statusElement, validationState);
  return hasNoValidationErrors(validationState);
}

/**
 * Applies error state to one field.
 */
function applyFieldState(fieldId, errorKey) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.toggle("is-invalid", Boolean(errorKey));
  updateAriaInvalid(field, errorKey);
  toggleConsentError(field, errorKey);
}

/**
 * Updates aria-invalid attribute on one element.
 */
function updateAriaInvalid(field, errorKey) {
  if (errorKey) return field.setAttribute("aria-invalid", "true");
  field.removeAttribute("aria-invalid");
}

/**
 * Toggles error class on consent group.
 */
function toggleConsentError(field, errorKey) {
  if (field.id !== "privacy-accepted") return;
  const consentGroup = field.closest(".consent-group");
  if (consentGroup) {
    consentGroup.classList.toggle("is-invalid", Boolean(errorKey));
  }
}

/**
 * Enables submit button only when form data is valid.
 */
function updateSubmitState(form, submitButton) {
  submitButton.disabled = !isFormValid(new FormData(form));
}

/**
 * Renders validation status message.
 */
function renderValidationStatus(statusElement, validationState) {
  const errorKey = getFirstErrorKey(validationState);
  setStatus(statusElement, errorKey ? getTranslation(errorKey) : "", errorKey ? "error" : "");
}

/**
 * Handles contact form submission.
 */
async function onContactSubmit(event, form, submitButton, statusElement, validationState) {
  event.preventDefault();
  const payload = buildPayload(new FormData(form));
  const endpoint = getEndpoint();
  if (!validateAllFields(form, validationState, statusElement)) {
    return;
  }
  if (!validateEndpoint(endpoint)) {
    setStatus(statusElement, getTranslation("form.status.endpoint"), "error");
    return;
  }
  
  // Set loading state
  submitButton.disabled = true;
  setStatus(statusElement, getTranslation("form.status.sending"));
  
  // Execute API call
  const result = await submitContact(form, submitButton, statusElement, endpoint, payload, validationState);
  
  // Handle result
  if (result.success) {
    onSubmitSuccess(form, statusElement, result.result, validationState);
  } else {
    onSubmitError(statusElement, result.error, endpoint, result.method);
  }
  
  updateSubmitState(form, submitButton);
}

/**
 * Handles submit success state.
 */
function onSubmitSuccess(form, statusElement, result, validationState) {
  form.reset();
  resetValidationState(validationState);
  clearFieldStates();
  setStatus(statusElement, getTranslation("form.status.success"), "success");
  console.info("[Contact Form] Send succeeded", {
    traceId: typeof result?.traceId === "string" ? result.traceId : ""
  });
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
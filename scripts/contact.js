import { getTranslation, getCurrentLanguage } from "./language.js";

const portfolioConfig = window.PORTFOLIO_CONFIG || {};
const FIELD_ORDER = ["name", "email", "message", "privacy-accepted"];
const TEXT_FIELD_IDS = ["name", "email", "message"];

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
 * Creates empty validation state object.
 */
function createValidationState() {
  return Object.fromEntries(FIELD_ORDER.map((fieldId) => [fieldId, null]));
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
 * Adds blur and input listeners to one text field.
 */
function addTextFieldListeners(form, fieldId, submitButton, statusElement, validationState) {
  const field = document.getElementById(fieldId);
  field?.addEventListener("blur", () => onFieldBlur(form, fieldId, submitButton, statusElement, validationState));
  field?.addEventListener("input", () => onFieldInput(form, fieldId, submitButton, statusElement, validationState));
}

/**
 * Adds change listener to privacy checkbox.
 */
function addCheckboxListener(form, submitButton, statusElement, validationState) {
  const checkbox = document.getElementById("privacy-accepted");
  checkbox?.addEventListener("change", () => {
    onFieldBlur(form, "privacy-accepted", submitButton, statusElement, validationState);
  });
}

/**
 * Validates one field after blur or change.
 */
function onFieldBlur(form, fieldId, submitButton, statusElement, validationState) {
  validateSingleField(form, fieldId, validationState, statusElement);
  updateSubmitState(form, submitButton);
}

/**
 * Revalidates only fields that already have an error.
 */
function onFieldInput(form, fieldId, submitButton, statusElement, validationState) {
  if (validationState[fieldId]) {
    validateSingleField(form, fieldId, validationState, statusElement);
  }
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
 * Returns translation key for one field error.
 */
function getFieldError(fieldId, formData) {
  const value = getFieldValue(formData, fieldId);
  if (fieldId === "privacy-accepted") return value ? null : "form.status.required";
  if (!value) return "form.status.required";
  if (fieldId === "email" && !hasValidEmail(value)) return "form.status.invalidEmail";
  return null;
}

/**
 * Returns normalized field value from form data.
 */
function getFieldValue(formData, fieldId) {
  if (fieldId === "privacy-accepted") return formData.get(fieldId) === "on";
  return getInputValue(formData, fieldId);
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
 * Toggles consent-group error state.
 */
function toggleConsentError(field, errorKey) {
  field.closest(".consent-group")?.classList.toggle("is-invalid", Boolean(errorKey));
}

/**
 * Clears all field error states.
 */
function clearFieldStates() {
  FIELD_ORDER.forEach((fieldId) => applyFieldState(fieldId, null));
}

/**
 * Renders the highest-priority active error.
 */
function renderValidationStatus(statusElement, validationState) {
  const errorKey = getFirstErrorKey(validationState);
  setStatus(statusElement, errorKey ? getTranslation(errorKey) : "", errorKey ? "error" : "");
}

/**
 * Returns first active error by field order.
 */
function getFirstErrorKey(validationState) {
  return FIELD_ORDER.map((fieldId) => validationState[fieldId]).find(Boolean) || null;
}

/**
 * Checks whether all fields are valid.
 */
function hasNoValidationErrors(validationState) {
  return !Object.values(validationState).some(Boolean);
}

/**
 * Enables submit button only when form data is valid.
 */
function updateSubmitState(form, submitButton) {
  submitButton.disabled = !isFormValid(new FormData(form));
}

/**
 * Checks whether current form data is valid.
 */
function isFormValid(formData) {
  return FIELD_ORDER.every((fieldId) => !getFieldError(fieldId, formData));
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
  if (!validateEndpoint(endpoint, statusElement)) {
    return;
  }
  await submitContact(form, submitButton, statusElement, endpoint, payload, validationState);
}

/**
 * Builds payload from form fields.
 */
function buildPayload(formData) {
  return {
    name: getInputValue(formData, "name"),
    email: getInputValue(formData, "email"),
    message: getInputValue(formData, "message"),
    website: getInputValue(formData, "website"),
    privacyAccepted: formData.get("privacy-accepted") === "on",
    language: getCurrentLanguage()
  };
}

/**
 * Returns trimmed string value from form data.
 */
function getInputValue(formData, key) {
  return String(formData.get(key) || "").trim();
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
async function submitContact(form, submitButton, statusElement, endpoint, payload, validationState) {
  const method = getRequestMethod();
  const sendFormat = getSendFormat();
  const requestOptions = buildRequestOptions(payload, method, sendFormat);
  setSubmitDisabled(submitButton, true);
  setStatus(statusElement, getTranslation("form.status.sending"));
  try {
    const result = await sendRequest(endpoint, requestOptions);
    onSubmitSuccess(form, statusElement, result, validationState);
  } catch (error) {
    onSubmitError(statusElement, error, endpoint, method);
  }
  updateSubmitState(form, submitButton);
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
  logSendStart(endpoint, requestOptions.method);
  const response = await fetch(endpoint, requestOptions);
  const data = await parseResponseData(response);
  validateResponse(response, data);
  return data;
}

/**
 * Logs request start for browser diagnostics.
 */
function logSendStart(endpoint, method) {
  console.info("[Contact Form] Sending request", { endpoint, method });
}

/**
 * Parses JSON response data when available.
 */
async function parseResponseData(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  return safeParseJson(response);
}

/**
 * Validates API response payload and status.
 */
function validateResponse(response, data) {
  if (!response.ok) {
    throw new Error(getResponseError(response.status, data));
  }
  if (data && data.success !== true) {
    throw new Error("Request failed: success flag missing");
  }
}

/**
 * Builds detailed response error text.
 */
function getResponseError(status, data) {
  const apiError = typeof data?.error === "string" ? data.error : "Request failed";
  const apiReason = typeof data?.reason === "string" ? data.reason : "";
  const traceId = typeof data?.traceId === "string" ? data.traceId : "";
  const reasonSuffix = apiReason ? ` | reason: ${apiReason}` : "";
  const traceSuffix = traceId ? ` | traceId: ${traceId}` : "";
  return `${apiError} (status ${status})${reasonSuffix}${traceSuffix}`;
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
 * Resets validation state object.
 */
function resetValidationState(validationState) {
  FIELD_ORDER.forEach((fieldId) => {
    validationState[fieldId] = null;
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

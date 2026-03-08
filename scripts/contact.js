import { getTranslation, getCurrentLanguage } from "./language.js";

const portfolioConfig = window.PORTFOLIO_CONFIG || {};

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
 * Initializes contact form with blur validation and submit handling.
 */
export function initContactForm() {
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("submit-btn");
  const statusElement = document.getElementById("form-status");
  if (!form || !submitButton || !statusElement) {
    return;
  }
  submitButton.disabled = true;
  addFieldValidationListeners(form, submitButton, statusElement);
  form.addEventListener("submit", (event) => {
    onContactSubmit(event, form, submitButton, statusElement);
  });
}

/**
 * Adds blur and change listeners for field validation.
 */
function addFieldValidationListeners(form, submitButton, statusElement) {
  ["name", "email", "message"].forEach((id) => {
    document.getElementById(id)?.addEventListener("blur", () => {
      validateFieldOnBlur(id, statusElement);
      updateSubmitState(form, submitButton);
    });
  });
  document.getElementById("privacy-accepted")?.addEventListener("change", () => {
    updateSubmitState(form, submitButton);
  });
}

/**
 * Validates a single field on blur and shows status if invalid.
 */
function validateFieldOnBlur(fieldId, statusElement) {
  const value = document.getElementById(fieldId)?.value.trim() || "";
  const errorKey = getFieldError(fieldId, value);
  if (errorKey) {
    setStatus(statusElement, getTranslation(errorKey), "error");
  } else {
    setStatus(statusElement, "", "");
  }
}

/**
 * Returns translation key for field error or null if valid.
 */
function getFieldError(fieldId, value) {
  if (!value) return "form.status.required";
  if (fieldId === "email" && !hasValidEmail(value)) return "form.status.invalidEmail";
  return null;
}

/**
 * Enables submit button only when all required fields are valid.
 */
function updateSubmitState(form, submitButton) {
  const payload = buildPayload(new FormData(form));
  submitButton.disabled = !hasRequiredFields(payload) || !hasValidEmail(payload.email);
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
    const result = await sendRequest(endpoint, requestOptions);
    onSubmitSuccess(form, statusElement, result);
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
function onSubmitSuccess(form, statusElement, result) {
  form.reset();
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

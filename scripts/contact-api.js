/**
 * API communication layer for contact form.
 * Handles HTTP requests and response processing.
 */

import { getTranslation, getCurrentLanguage } from "./language.js";
import { portfolioConfig } from "./contact-config.js";

/**
 * Handles contact form submission.
 */
export async function onContactSubmit(event, form, submitButton, statusElement, validationState, validateAllFields, validateEndpoint, setStatus, clearFieldStates, resetValidationState, updateSubmitState, getInputValue) {
  event.preventDefault();
  const payload = buildPayload(new FormData(form), getInputValue);
  const endpoint = getEndpoint();
  if (!validateAllFields(form, validationState, statusElement)) {
    return;
  }
  if (!validateEndpoint(endpoint, statusElement)) {
    return;
  }
  await submitContact(form, submitButton, statusElement, endpoint, payload, validationState, setStatus, clearFieldStates, resetValidationState, updateSubmitState);
}

/**
 * Builds payload from form fields.
 */
export function buildPayload(formData) {
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
 * Reads endpoint from runtime config.
 */
export function getEndpoint() {
  return String(portfolioConfig.form?.endpoint || "").trim();
}

/**
 * Validates configured endpoint.
 */
export function validateEndpoint(endpoint, statusElement) {
  if (endpoint && !endpoint.includes("example.invalid")) {
    return true;
  }
  return false;
}

/**
 * Sends contact request and updates UI state.
 */
export async function submitContact(form, submitButton, statusElement, endpoint, payload, validationState) {
  const { method, requestOptions } = prepareSubmitRequest(payload);
  try {
    const result = await sendRequest(endpoint, requestOptions);
    return { success: true, result };
  } catch (error) {
    return { success: false, error, method };
  }
}

/**
 * Prepares submit request and sets initial UI state.
 */
function prepareSubmitRequest(payload) {
  const method = getRequestMethod();
  const sendFormat = getSendFormat();
  const requestOptions = buildRequestOptions(payload, method, sendFormat);
  return { method, sendFormat, requestOptions };
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
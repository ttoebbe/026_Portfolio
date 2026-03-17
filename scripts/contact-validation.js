/**
 * Pure validation logic for contact form fields.
 * Contains field validation rules without DOM manipulation.
 */

const FIELD_ORDER = ["name", "email", "message", "privacy-accepted"];
const TEXT_FIELD_IDS = ["name", "email", "message"];

/**
 * Creates empty validation state object.
 */
export function createValidationState() {
  return Object.fromEntries(FIELD_ORDER.map((fieldId) => [fieldId, null]));
}

/**
 * Returns translation key for one field error.
 */
export function getFieldError(fieldId, formData) {
  const value = getFieldValue(formData, fieldId);
  if (fieldId === "privacy-accepted") return value ? null : "form.status.required";
  if (!value) return "form.status.required";
  if (fieldId === "email" && !hasValidEmail(value)) return "form.status.invalidEmail";
  return null;
}

/**
 * Returns normalized field value from form data.
 */
export function getFieldValue(formData, fieldId) {
  if (fieldId === "privacy-accepted") return formData.get(fieldId) === "on";
  return getInputValue(formData, fieldId);
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
export function hasValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks whether all fields are valid.
 */
export function hasNoValidationErrors(validationState) {
  return !Object.values(validationState).some(Boolean);
}

/**
 * Checks whether current form data is valid.
 */
export function isFormValid(formData) {
  return FIELD_ORDER.every((fieldId) => !getFieldError(fieldId, formData));
}

/**
 * Returns first active error by field order.
 */
export function getFirstErrorKey(validationState) {
  return FIELD_ORDER.map((fieldId) => validationState[fieldId]).find(Boolean) || null;
}

/**
 * Returns specific error key for each field.
 */
export function getSpecificFieldError(fieldId, formData) {
  const value = getFieldValue(formData, fieldId);
  
  if (fieldId === "privacy-accepted") {
    return value ? null : "form.status.privacy.required";
  }
  
  if (!value) {
    switch (fieldId) {
      case "name": return "form.status.name.required";
      case "email": return "form.status.email.required"; 
      case "message": return "form.status.message.required";
      default: return "form.status.required";
    }
  }
  
  if (fieldId === "email" && !hasValidEmail(value)) {
    return "form.status.invalidEmail";
  }
  
  return null;
}

/**
 * Returns first specific error for invalid form.
 */
export function getFirstSpecificError(formData) {
  for (const fieldId of FIELD_ORDER) {
    const error = getSpecificFieldError(fieldId, formData);
    if (error) return error;
  }
  return null;
}

/**
 * Resets validation state object.
 */
export function resetValidationState(validationState) {
  FIELD_ORDER.forEach((fieldId) => {
    validationState[fieldId] = null;
  });
}

export { FIELD_ORDER, TEXT_FIELD_IDS };
/** E.164-compatible input after removing common visual separators. */
export const PHONE_PATTERN = /^\+[0-9]{8,15}$/;
export const PHONE_INPUT_PATTERN = "\\+?[0-9 ()-]{8,24}";

export function normalizePhone(phone: string | null | undefined): string | null {
  const value = phone?.trim() ?? "";
  if (!value) return null;
  return value.replace(/[\s-]/g, "");
}

export function isValidPhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  return normalized === null || PHONE_PATTERN.test(normalized);
}

export function validatePhone(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone);
  if (normalized !== null && !PHONE_PATTERN.test(normalized)) {
    throw new Error("Phone number must use international format, such as +60123456789.");
  }
  return normalized;
}

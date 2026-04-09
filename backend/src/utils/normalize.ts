/**
 * Normalizes phone numbers to E.164 format.
 * Strips all non-digit characters and prepends +91 if 10 digits are provided.
 */
export const normalizePhone = (phone: string): string => {
  // If it doesn't look like a phone number (no digits and doesn't start with +), return original
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length < 10 && !phone.startsWith("+")) {
    return phone;
  }
  
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If already starts with 91 and is 12 digits, just prepend +
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Fallback for other lengths (e.g. including + already or other country codes)
  return phone.startsWith("+") ? phone : `+${digits}`;
};

export interface Ez888nUrlValidationResult {
  isValid: boolean;
  url: string | null;
  error?: string;
  isLocalhost?: boolean;
}

/**
 * Validates and sanitizes the EZ888N application URL.
 *
 * Requirements:
 * - Requires HTTPS for hosted environments.
 * - Permits HTTP only on localhost for development.
 * - Rejects malformed and script URLs.
 * - Removes embedded usernames and passwords.
 * - Returns error messages when missing or invalid.
 */
export function validateEz888nAppUrl(rawUrl?: string | null): Ez888nUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: false,
      url: null,
      error: "VITE_EZ888N_APP_URL is not configured.",
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      url: null,
      error: "VITE_EZ888N_APP_URL is empty.",
    };
  }

  // Reject script or dangerous protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("file:")
  ) {
    return {
      isValid: false,
      url: null,
      error: "Script or non-web URLs are strictly forbidden.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      url: null,
      error: "Malformed URL format.",
    };
  }

  // Strip embedded credentials (username and password)
  parsed.username = "";
  parsed.password = "";

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase();

  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  if (protocol === "http:") {
    if (!isLocalhost) {
      return {
        isValid: false,
        url: null,
        error: "Insecure HTTP protocol is not permitted for hosted environments. HTTPS is required.",
      };
    }
  } else if (protocol !== "https:") {
    return {
      isValid: false,
      url: null,
      error: "Invalid protocol. Only HTTPS (or HTTP on localhost) is permitted.",
    };
  }

  // Normalize URL by stripping trailing slash
  const normalizedUrl = parsed.toString().replace(/\/$/, "");

  return {
    isValid: true,
    url: normalizedUrl,
    isLocalhost,
  };
}

export function getEz888nAppUrl(): Ez888nUrlValidationResult {
  const envUrl =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_EZ888N_APP_URL as string | undefined)
      : process.env.VITE_EZ888N_APP_URL;

  return validateEz888nAppUrl(envUrl);
}

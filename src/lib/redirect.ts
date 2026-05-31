const AUTH_REDIRECT_FALLBACK = "/dashboard";
const AUTH_REDIRECT_BLOCKED_PREFIXES = ["/login", "/register", "/restore-account"];

export function getSafeRedirectPath(value: string | string[] | undefined | null, fallback = AUTH_REDIRECT_FALLBACK) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const redirectPath = rawValue?.trim();

  if (!redirectPath || !redirectPath.startsWith("/") || redirectPath.startsWith("//")) return fallback;

  try {
    const url = new URL(redirectPath, "http://schoolsaver.local");
    if (url.origin !== "http://schoolsaver.local") return fallback;
    if (AUTH_REDIRECT_BLOCKED_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}


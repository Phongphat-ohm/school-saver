const MEMBER_QR_PREFIX = "schoolsaver:member:";

export function createMemberPaymentQrValue(memberCode: string, origin?: string) {
  const code = memberCode.trim();
  if (origin) return `${origin}/payments?member=${encodeURIComponent(code)}`;
  return `${MEMBER_QR_PREFIX}${code}`;
}

export function extractMemberCodeFromQr(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  if (value.toLowerCase().startsWith(MEMBER_QR_PREFIX)) {
    const code = value.slice(MEMBER_QR_PREFIX.length).trim();
    return code || null;
  }

  try {
    const parsed = JSON.parse(value) as { memberCode?: unknown; member?: unknown };
    const code = typeof parsed.memberCode === "string" ? parsed.memberCode : typeof parsed.member === "string" ? parsed.member : "";
    return code.trim() || null;
  } catch {
    // Continue parsing as URL or plain member code.
  }

  try {
    const url = new URL(value);
    const code = url.searchParams.get("member") ?? url.searchParams.get("memberCode");
    if (code?.trim()) return code.trim();
  } catch {
    const queryMatch = value.match(/[?&](?:member|memberCode)=([^&]+)/);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]).trim();
  }

  return /^[\p{L}\p{N}_-]{1,64}$/u.test(value) ? value : null;
}

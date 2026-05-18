const MEMBER_QR_PREFIX = "schoolsaver:member:";

export type MemberPaymentQrPayload = {
  memberCode: string;
  paymentMethodId?: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function createMemberPaymentQrValue(memberCode: string, origin?: string, paymentMethodId?: string | null) {
  const code = memberCode.trim();
  if (origin) {
    const url = new URL("/payments", origin);
    url.searchParams.set("member", code);
    if (paymentMethodId?.trim()) url.searchParams.set("paymentMethodId", paymentMethodId.trim());
    return url.toString();
  }
  return `${MEMBER_QR_PREFIX}${code}`;
}

export function extractMemberPaymentQrPayload(rawValue: string): MemberPaymentQrPayload | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (value.toLowerCase().startsWith(MEMBER_QR_PREFIX)) {
    const code = value.slice(MEMBER_QR_PREFIX.length).trim();
    return code ? { memberCode: code } : null;
  }

  try {
    const parsed = JSON.parse(value) as { memberCode?: unknown; member?: unknown; paymentMethodId?: unknown; methodId?: unknown; paymentMethod?: unknown };
    const code = readString(parsed.memberCode) || readString(parsed.member);
    const paymentMethodId = readString(parsed.paymentMethodId) || readString(parsed.methodId) || readString(parsed.paymentMethod);
    return code ? { memberCode: code, paymentMethodId: paymentMethodId || null } : null;
  } catch {
    // Continue parsing as URL or plain member code.
  }

  try {
    const url = new URL(value);
    const code = url.searchParams.get("member") ?? url.searchParams.get("memberCode");
    const paymentMethodId = url.searchParams.get("paymentMethodId") ?? url.searchParams.get("methodId");
    if (code?.trim()) return { memberCode: code.trim(), paymentMethodId: paymentMethodId?.trim() || null };
  } catch {
    const queryMatch = value.match(/[?&](?:member|memberCode)=([^&]+)/);
    if (queryMatch?.[1]) {
      const paymentMethodMatch = value.match(/[?&](?:paymentMethodId|methodId)=([^&]+)/);
      return {
        memberCode: decodeURIComponent(queryMatch[1]).trim(),
        paymentMethodId: paymentMethodMatch?.[1] ? decodeURIComponent(paymentMethodMatch[1]).trim() : null,
      };
    }
  }

  return /^[\p{L}\p{N}_-]{1,64}$/u.test(value) ? { memberCode: value } : null;
}

export function extractMemberCodeFromQr(rawValue: string) {
  return extractMemberPaymentQrPayload(rawValue)?.memberCode ?? null;
}

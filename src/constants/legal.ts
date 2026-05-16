export const LEGAL_TERMS_VERSION = "tos-th-2026-05-16";
export const LEGAL_PRIVACY_VERSION = "pdpa-th-2026-05-16";

export const legalUpdatedDate = "16 พฤษภาคม 2569";

export function hasAcceptedCurrentLegal(user: {
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
}) {
  return (
    !!user.termsAcceptedAt &&
    user.termsVersion === LEGAL_TERMS_VERSION &&
    !!user.privacyAcceptedAt &&
    user.privacyVersion === LEGAL_PRIVACY_VERSION
  );
}


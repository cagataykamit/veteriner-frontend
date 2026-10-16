const link = (linkId: string) => `links/${encodeURIComponent(linkId)}`;

/**
 * Portal API yolları (`PORTAL_API_CONTRACT.md` §5, §6, §7). Kökten göreli; kök `PORTAL_API_BASE_URL`.
 */
export const PORTAL_ENDPOINTS = {
    legalDocuments: 'legal-documents',
    invite: (token: string) => `invites/${encodeURIComponent(token)}`,
    acceptInvite: (token: string) => `invites/${encodeURIComponent(token)}/accept`,
    requestCode: 'auth/code',
    verifyCode: 'auth/code/verify',
    login: 'auth/login',
    passwordReset: 'auth/password-reset',
    passwordResetConfirm: 'auth/password-reset/confirm',
    refresh: 'auth/refresh',
    logout: 'auth/logout',
    logoutAll: 'auth/logout-all',
    me: 'me',
    myLegalAcceptances: 'me/legal-acceptances',
    clinicDisclosure: (linkId: string) => `${link(linkId)}/clinic-disclosure`,
    acknowledgeClinicDisclosure: (linkId: string) => `${link(linkId)}/clinic-disclosure/acknowledge`,
    // Dilim B, salt okunur (§6)
    clinic: (linkId: string) => `${link(linkId)}/clinic`,
    pets: (linkId: string) => `${link(linkId)}/pets`,
    pet: (linkId: string, petId: string) => `${link(linkId)}/pets/${encodeURIComponent(petId)}`,
    petVaccinations: (linkId: string, petId: string) => `${link(linkId)}/pets/${encodeURIComponent(petId)}/vaccinations`,
    appointments: (linkId: string) => `${link(linkId)}/appointments`,
    balance: (linkId: string) => `${link(linkId)}/balance`,
    payments: (linkId: string) => `${link(linkId)}/payments`
} as const;

/** Anonim uçlar (sözleşme §7 "Anonim"): Bearer eklenmez, 401'de yenileme denenmez. */
const ANONYMOUS_EXACT = new Set<string>([
    PORTAL_ENDPOINTS.legalDocuments,
    PORTAL_ENDPOINTS.requestCode,
    PORTAL_ENDPOINTS.verifyCode,
    PORTAL_ENDPOINTS.login,
    PORTAL_ENDPOINTS.passwordReset,
    PORTAL_ENDPOINTS.passwordResetConfirm,
    PORTAL_ENDPOINTS.refresh
]);

export function isAnonymousPortalPath(relativePath: string): boolean {
    return ANONYMOUS_EXACT.has(relativePath) || relativePath.startsWith('invites/');
}

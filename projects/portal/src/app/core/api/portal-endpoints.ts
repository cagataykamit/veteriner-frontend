const link = (linkId: string) => `links/${encodeURIComponent(linkId)}`;
const booking = (code: string) => `booking/${encodeURIComponent(code)}`;

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
    meDeletionCode: 'me/deletion-code',
    myLegalAcceptances: 'me/legal-acceptances',
    clinicDisclosure: (linkId: string) => `${link(linkId)}/clinic-disclosure`,
    acknowledgeClinicDisclosure: (linkId: string) => `${link(linkId)}/clinic-disclosure/acknowledge`,
    reminderPreferences: (linkId: string) => `${link(linkId)}/reminder-preferences`,
    // Bildirim tercihleri ve KVKK veri talebi (PORTAL_API_CONTRACT.md §10, §11)
    myNotificationPreferences: 'me/notification-preferences',
    // Push cihaz jetonu (§14.2, §14.3; MOBILE-003)
    myPushDevices: 'me/push-devices',
    myPushDevicesRevoke: 'me/push-devices/revoke',
    notificationPreferences: (linkId: string) => `${link(linkId)}/notification-preferences`,
    dataRequests: (linkId: string) => `${link(linkId)}/data-requests`,
    cancelDataRequest: (linkId: string, id: string) => `${link(linkId)}/data-requests/${encodeURIComponent(id)}/cancel`,
    // Dilim B, salt okunur (§6)
    clinic: (linkId: string) => `${link(linkId)}/clinic`,
    pets: (linkId: string) => `${link(linkId)}/pets`,
    pet: (linkId: string, petId: string) => `${link(linkId)}/pets/${encodeURIComponent(petId)}`,
    petVaccinations: (linkId: string, petId: string) => `${link(linkId)}/pets/${encodeURIComponent(petId)}/vaccinations`,
    appointments: (linkId: string) => `${link(linkId)}/appointments`,
    // Takvime ekle (TIER-020; APPOINTMENT_OWNER_LINK_API_CONTRACT.md §8.6)
    appointmentCalendar: (linkId: string, appointmentId: string) => `${link(linkId)}/appointments/${encodeURIComponent(appointmentId)}/calendar.ics`,
    balance: (linkId: string) => `${link(linkId)}/balance`,
    payments: (linkId: string) => `${link(linkId)}/payments`,
    // Online randevu talebi (ONLINE_APPOINTMENT_API_CONTRACT.md §5 kimliksiz bağlantı, §6 oturumlu)
    publicBooking: (code: string) => booking(code),
    publicBookingAvailability: (code: string) => `${booking(code)}/availability`,
    publicBookingCode: (code: string) => `${booking(code)}/verification-code`,
    publicBookingRequests: (code: string) => `${booking(code)}/requests`,
    publicBookingLogo: (code: string) => `${booking(code)}/logo`,
    linkBooking: (linkId: string) => `${link(linkId)}/booking`,
    linkBookingAvailability: (linkId: string) => `${link(linkId)}/booking/availability`,
    appointmentRequests: (linkId: string) => `${link(linkId)}/appointment-requests`,
    cancelAppointmentRequest: (linkId: string, requestId: string) => `${link(linkId)}/appointment-requests/${encodeURIComponent(requestId)}/cancel`,
    // Hatırlatmada onayla / iptal et (APPOINTMENT_OWNER_LINK_API_CONTRACT.md §3): kimliksiz, token gövdede (yolda görünmez)
    appointmentLinkPreview: 'appointment-link/preview',
    appointmentLinkConfirm: 'appointment-link/confirm',
    appointmentLinkCancel: 'appointment-link/cancel',
    // Takvime ekle (TIER-020, §8.5): .ics, token gövdede; onaydan sonra da çalışır
    appointmentLinkCalendar: 'appointment-link/calendar',
    // Ticari iletideki ret bağlantısı (ADR-046; AUTOMATED_REMINDERS_API_CONTRACT.md §2): kimliksiz, token gövdede
    marketingOptOutPreview: 'marketing-opt-out/preview',
    marketingOptOutConfirm: 'marketing-opt-out/confirm',
    // Bekleme listesi teklifi (TIER-018; WAITLIST_API_CONTRACT.md §4): kimliksiz, token gövdede; preview durum değiştirmez
    waitlistOfferPreview: 'waitlist-offer/preview',
    waitlistOfferAccept: 'waitlist-offer/accept',
    waitlistOfferDecline: 'waitlist-offer/decline'
} as const;

/** Anonim uçlar (sözleşme §7 "Anonim"): Bearer eklenmez, 401'de yenileme denenmez. */
const ANONYMOUS_EXACT = new Set<string>([
    PORTAL_ENDPOINTS.legalDocuments,
    PORTAL_ENDPOINTS.requestCode,
    PORTAL_ENDPOINTS.verifyCode,
    PORTAL_ENDPOINTS.login,
    PORTAL_ENDPOINTS.passwordReset,
    PORTAL_ENDPOINTS.passwordResetConfirm,
    PORTAL_ENDPOINTS.refresh,
    PORTAL_ENDPOINTS.appointmentLinkPreview,
    PORTAL_ENDPOINTS.appointmentLinkConfirm,
    PORTAL_ENDPOINTS.appointmentLinkCancel,
    PORTAL_ENDPOINTS.appointmentLinkCalendar,
    PORTAL_ENDPOINTS.marketingOptOutPreview,
    PORTAL_ENDPOINTS.marketingOptOutConfirm,
    PORTAL_ENDPOINTS.waitlistOfferPreview,
    PORTAL_ENDPOINTS.waitlistOfferAccept,
    PORTAL_ENDPOINTS.waitlistOfferDecline
]);

export function isAnonymousPortalPath(relativePath: string): boolean {
    return ANONYMOUS_EXACT.has(relativePath) || relativePath.startsWith('invites/') || relativePath.startsWith('booking/');
}

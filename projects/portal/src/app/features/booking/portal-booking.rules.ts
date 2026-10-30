import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';

/** Talep alanı uzunlukları (backend `AppointmentRequest` sabitleriyle aynı); sunucu yine doğrular. */
export const PORTAL_BOOKING_LIMITS = {
    contactName: 150,
    phone: 30,
    petName: 100,
    petSpecies: 60,
    petBreed: 100,
    note: 500
} as const;

/** Bekleyen talep sınırı mesajı; sayfa sınırı biliniyorsa sayıyla. */
export function pendingLimitMessage(maxPending: number | null | undefined): string {
    return maxPending && maxPending > 0
        ? `Bu klinikte aynı anda en fazla ${maxPending} bekleyen talebiniz olabilir. Klinik mevcut taleplerinizi yanıtladıktan sonra yeni talep oluşturabilirsiniz.`
        : PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.pendingLimitReached];
}

/** Küçük enum / kod → etiket haritaları için yardımcı. */
export function labelFromMap<T extends string>(value: T | null | undefined, map: Record<T, string>, fallback = '—'): string {
    if (value == null) {
        return fallback;
    }
    return map[value] ?? fallback;
}

/**
 * Swagger: `AppointmentStatus` (int32 enum — sunucudaki sıraya göre güncelleyin).
 * Tipik: 0 = Planlandı, 1 = Onaylı/Tamamlandı, 2 = İptal (doğrulama için backend’e bakın).
 */
const APPOINTMENT_STATUS_BY_CODE: Record<number, string> = {
    0: 'Planlandı',
    1: 'Onaylı',
    2: 'İptal'
};

export function appointmentStatusLabel(status: number | string | null | undefined): string {
    if (status === null || status === undefined) {
        return '—';
    }
    if (typeof status === 'number') {
        return APPOINTMENT_STATUS_BY_CODE[status] ?? `Durum (${status})`;
    }
    return status;
}

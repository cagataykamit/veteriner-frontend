/**
 * Dolu parçaları ayırıcıyla birleştirir; boş ve "—" parçası ayırıcısıyla birlikte atlanır (G-05): "Burcu Çelik — —" yerine
 * "Burcu Çelik", "— · Hastalar: Limon" yerine "Hastalar: Limon".
 */
export function joinPresent(parts: readonly (string | null | undefined)[], separator: string): string {
    return parts
        .map((p) => (p ?? '').trim())
        .filter((p) => p !== '' && p !== '—')
        .join(separator);
}

/** Küçük enum / kod → etiket haritaları için yardımcı. */
export function labelFromMap<T extends string>(value: T | null | undefined, map: Record<T, string>, fallback = '—'): string {
    if (value == null) {
        return fallback;
    }

    return map[value] ?? fallback;
}

/**
 * Swagger: `AppointmentStatus` (int32 enum — sunucudaki sıraya göre güncelleyin).
 * Randevu API: 0 = Planlandı (Scheduled), 1 = Tamamlandı (Completed), 2 = İptal (Cancelled).
 */
const APPOINTMENT_STATUS_BY_CODE: Record<number, string> = {
    0: 'Planlandı',
    1: 'Tamamlandı',
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

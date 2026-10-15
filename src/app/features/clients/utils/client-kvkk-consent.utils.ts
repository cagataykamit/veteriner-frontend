/**
 * Müşterinin imzalı KVKK açık rıza formu sonucu (`KVKK_CONSENT_API_CONTRACT.md` §1, ADR-021 madde 3).
 * `None` = form alınmadı (mevcut tüm müşteriler). Hatırlatma tercihini değiştirmez (K7).
 */
export type KvkkConsentStatus = 'None' | 'Accepted' | 'Declined';

export const KVKK_CONSENT_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: KvkkConsentStatus }> = [
    { label: 'Yok', value: 'None' },
    { label: 'Kabul', value: 'Accepted' },
    { label: 'Ret', value: 'Declined' }
];

/** API değeri (metin, büyük/küçük harf duyarsız; ya da `0`/`1`/`2`) → durum; eksik/bilinmeyen değer `None`. */
export function parseKvkkConsentStatus(raw: unknown): KvkkConsentStatus {
    if (typeof raw === 'number') {
        return KVKK_CONSENT_STATUS_OPTIONS[raw]?.value ?? 'None';
    }

    const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

    return KVKK_CONSENT_STATUS_OPTIONS.find((o) => o.value.toLowerCase() === key)?.value ?? 'None';
}

export function kvkkConsentStatusLabel(status: KvkkConsentStatus): string {
    return KVKK_CONSENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Yok';
}

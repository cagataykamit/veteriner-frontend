/**
 * Kayıt silinmiş mi (ADR-054): kart salt okunur açılır, yeni işlem ve yeni kayıt girişleri (düzenleme, eylem çubuğu, "+ Ekle",
 * davet…) çizilmez (K3). Müşteri ve hasta kartı ile bölümleri bu tek kurala bağlanır.
 */
export function isRecordDeleted(record: { readonly deletedAtUtc: string | null } | null | undefined): boolean {
    return !!record?.deletedAtUtc;
}

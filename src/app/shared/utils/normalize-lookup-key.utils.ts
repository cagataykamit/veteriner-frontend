/**
 * API / form / legacy string’leri eşleştirme anahtarına çevirir.
 * Status, tür, cinsiyet vb. metadata lookup’larında tek kural (DRY).
 */
export function normalizeLookupKey(value: string | null | undefined): string {
    return (value ?? '').toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '_');
}

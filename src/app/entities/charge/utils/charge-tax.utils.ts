/** Ücret satır türü (ADR-036); varsayılan hizmet. */
export type ChargeLineKind = 'Service' | 'Product';

export const CHARGE_LINE_KIND_OPTIONS: readonly { label: string; value: ChargeLineKind }[] = [
    { label: 'Hizmet', value: 'Service' },
    { label: 'Ürün', value: 'Product' }
];

/**
 * Seçilebilir KDV oranları (%). Sunucu 0–100 arası her oranı kabul eder (`INVOICING_IDENTITY_API_CONTRACT.md` §5);
 * liste yürürlükteki oranlardır ve yalnız burada değişir. `null` = klinik varsayılanı (Ayarlar > Klinik > Mükellef bilgileri).
 */
export const CHARGE_VAT_RATE_OPTIONS: readonly { label: string; value: number | null }[] = [
    { label: 'Klinik varsayılanı', value: null },
    { label: '%0', value: 0 },
    { label: '%1', value: 1 },
    { label: '%10', value: 10 },
    { label: '%20', value: 20 }
];

export function parseChargeLineKind(raw: unknown): ChargeLineKind {
    return raw === 'Product' ? 'Product' : 'Service';
}

export function chargeLineKindLabel(kind: ChargeLineKind): string {
    return CHARGE_LINE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? 'Hizmet';
}

export function chargeVatRateLabel(rate: number | null): string {
    return rate == null ? 'Klinik varsayılanı' : `%${rate}`;
}

/** Listede olmayan kayıtlı oran (ör. eski/özel oran) düzeltme diyaloğunda seçenek olarak eklenir. */
export function chargeVatRateOptionsIncluding(rate: number | null): { label: string; value: number | null }[] {
    const options = [...CHARGE_VAT_RATE_OPTIONS];

    return rate == null || options.some((o) => o.value === rate) ? options : [...options, { label: chargeVatRateLabel(rate), value: rate }];
}

import type { ProductControlledClassApi, ProductKindApi } from '@/app/features/inventory/models/product-api.model';

export const PRODUCT_KIND_OPTIONS: readonly { label: string; value: ProductKindApi }[] = [
    { label: 'Diğer', value: 'Other' },
    { label: 'İlaç', value: 'Medicine' },
    { label: 'Aşı', value: 'Vaccine' },
    { label: 'Hizmet', value: 'Service' }
];

export const PRODUCT_CONTROLLED_CLASS_OPTIONS: readonly { label: string; value: ProductControlledClassApi }[] = [
    { label: 'Yok (kontrole tabi değil)', value: 'None' },
    { label: 'Narkotik', value: 'Narcotic' },
    { label: 'Psikotropik', value: 'Psychotropic' }
];

export function productKindFromApi(v: string | null | undefined): ProductKindApi {
    return v === 'Medicine' || v === 'Vaccine' || v === 'Service' ? v : 'Other';
}

export function productControlledClassFromApi(v: string | null | undefined): ProductControlledClassApi {
    return v === 'Narcotic' || v === 'Psychotropic' ? v : 'None';
}

export function productKindLabel(v: ProductKindApi): string {
    return PRODUCT_KIND_OPTIONS.find((o) => o.value === v)?.label ?? 'Diğer';
}

/** Hizmet stok takipsizdir; stok, uygulama, satış, reçete ve stok hareketi akışlarında kullanılamaz (`Products.NotStockTracked`). */
export function isStockTrackedKind(kind: ProductKindApi): boolean {
    return kind !== 'Service';
}

/** Tür hizmete veya hizmetten çevrilemez (`Products.KindChangeNotAllowed`): düzenlemede seçenekler özgün türün tarafıyla sınırlıdır. */
export function productKindOptionsFor(originalKind: ProductKindApi | null): readonly { label: string; value: ProductKindApi }[] {
    return originalKind === null ? PRODUCT_KIND_OPTIONS : PRODUCT_KIND_OPTIONS.filter((o) => (o.value === 'Service') === (originalKind === 'Service'));
}

export function productControlledClassLabel(v: ProductControlledClassApi): string {
    return PRODUCT_CONTROLLED_CLASS_OPTIONS.find((o) => o.value === v)?.label ?? 'Yok (kontrole tabi değil)';
}

/** Aşı veya kontrollü ürün: stok girişinde seri/lot no ve SKT zorunludur (`BATCH_STOCK_API_CONTRACT.md` §1). */
export function productRequiresLotAndExpiry(kind: ProductKindApi, controlledClass: ProductControlledClassApi): boolean {
    return kind === 'Vaccine' || controlledClass !== 'None';
}

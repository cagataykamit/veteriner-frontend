import type { ProductControlledClassApi, ProductKindApi } from '@/app/entities/inventory/models/product-api.model';

/** Ürün create/update formundan mapper’a giden düz değerler. */
export interface ProductUpsertFormValue {
    name: string;
    productCategoryId: string;
    sku: string;
    barcode: string;
    unit: string;
    unitPrice: number | null;
    currency: string;
    description: string;
    kind: ProductKindApi;
    controlledClass: ProductControlledClassApi;
    pharmacologicalForm: string;
    presentationForm: string;
    packaging: string;
    manufacturer: string;
    /** `null` = klinik varsayılanı. */
    vatRate: number | null;
    /** Bilgi amaçlı; boş = `null`. */
    purchasePrice: number | null;
}

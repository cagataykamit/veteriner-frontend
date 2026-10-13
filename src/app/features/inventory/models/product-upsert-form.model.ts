import type { ProductControlledClassApi, ProductKindApi } from '@/app/features/inventory/models/product-api.model';

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
}

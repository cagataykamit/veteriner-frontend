import type { ProductControlledClassApi, ProductKindApi } from '@/app/features/inventory/models/product-api.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface ProductListItemVm {
    id: string;
    name: string;
    kind: ProductKindApi;
    sku: string;
    categoryName: string;
    unit: string;
    unitPriceText: string;
    currency: string;
    isActive: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
}

export interface ProductCategoryListItemVm {
    id: string;
    name: string;
    descriptionText: string;
    isActive: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
}

export interface ProductDetailVm {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    description: string;
    kind: ProductKindApi;
    kindLabel: string;
    controlledClass: ProductControlledClassApi;
    controlledClassLabel: string;
    /** Aşı / kontrollü ürün: stok girişinde seri no ve SKT zorunlu. */
    requiresLotAndExpiry: boolean;
    pharmacologicalForm: string;
    presentationForm: string;
    packaging: string;
    categoryName: string;
    unit: string;
    unitPriceText: string;
    currency: string;
    isActive: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
}

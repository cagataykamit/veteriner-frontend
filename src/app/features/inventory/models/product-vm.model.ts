import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface ProductListItemVm {
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    unit: string;
    unitPriceText: string;
    currency: string;
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
    categoryName: string;
    unit: string;
    unitPriceText: string;
    currency: string;
    isActive: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
}

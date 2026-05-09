import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface StockMovementVm {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productDisplayName: string;
    productCategoryName: string;
    clinicName: string;
    movementType: string;
    movementTypeLabel: string;
    movementTypeSeverity: StatusTagSeverity;
    quantity: number;
    quantityText: string;
    unitCostText: string;
    reason: string;
    referenceText: string;
    occurredAtText: string;
    createdAtText: string;
    notes: string;
}

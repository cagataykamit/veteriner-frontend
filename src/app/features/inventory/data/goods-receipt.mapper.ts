import type { GoodsReceiptFormGroup } from '@/app/features/inventory/forms/goods-receipt-form.factory';
import { isStockBatchExpiryPast } from '@/app/features/inventory/forms/stock-batch-form.factory';
import type { CreateGoodsReceiptRequest } from '@/app/features/inventory/models/goods-receipt-api.model';
import type { GoodsReceiptProductPick } from '@/app/features/inventory/models/goods-receipt-form.model';

const orNull = (s: string | null | undefined): string | null => (s?.trim() ? s.trim() : null);

/** Form → POST gövdesi. Ürünü seçilmemiş satır doğrulamada elenir; burada gelmesi programlama hatasıdır. */
export function mapGoodsReceiptFormToRequest(form: GoodsReceiptFormGroup, requestId: string): CreateGoodsReceiptRequest {
    const v = form.getRawValue();

    return {
        clinicId: v.clinicId.trim(),
        requestId,
        supplierName: orNull(v.supplierName),
        invoiceNumber: orNull(v.invoiceNumber),
        invoiceDate: orNull(v.invoiceDate),
        receivedDate: orNull(v.receivedDate),
        dispatchedDate: orNull(v.dispatchedDate),
        transportMethod: orNull(v.transportMethod),
        coldChainMonitor: orNull(v.coldChainMonitor),
        lines: v.lines.map((l) => {
            const expiryDate = orNull(l.expiryDate);

            return {
                productId: (l.product as GoodsReceiptProductPick).id,
                quantity: Number(l.quantity),
                lotNumber: orNull(l.lotNumber),
                expiryDate,
                unitCost: l.unitCost === null || l.unitCost === undefined || (l.unitCost as unknown) === '' ? null : Number(l.unitCost),
                ...(l.acknowledgeExpired && isStockBatchExpiryPast(expiryDate) ? { acknowledgeExpired: true as const } : {})
            };
        })
    };
}

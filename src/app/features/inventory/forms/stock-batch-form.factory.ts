import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import type { StockMovementBatchRequest } from '@/app/features/inventory/models/stock-batch-api.model';
import { istanbulTodayYmdNow, stockBatchExpiryStatus, toYmdOrNull } from '@/app/features/inventory/utils/stock-batch-expiry.utils';

export const STOCK_BATCH_LOT_MAX = 100;
export const STOCK_BATCH_SUPPLIER_MAX = 200;
export const STOCK_BATCH_INVOICE_MAX = 100;
export const STOCK_BATCH_TRANSPORT_MAX = 200;

/** Depo çıkış tarihi, geliş/teslim tarihinden sonra olamaz (`StockBatches.Validation`); ikisi de doluysa denetlenir. */
function dispatchedNotAfterReceivedValidator(group: AbstractControl): ValidationErrors | null {
    const received = group.get('receivedDate')?.value as string | undefined;
    const dispatched = group.get('dispatchedDate')?.value as string | undefined;
    return received && dispatched && dispatched > received ? { dispatchedAfterReceived: true } : null;
}

/** SKT bugünden önceyse (ADR-015 karar 6) girişi kullanıcı açıkça onaylamadan kaydedilemez. */
function expiredAcknowledgedValidator(group: AbstractControl): ValidationErrors | null {
    const acknowledged = group.get('acknowledgeExpired')?.value === true;
    return !acknowledged && isStockBatchExpiryPast(group.get('expiryDate')?.value) ? { expiredNotAcknowledged: true } : null;
}

/** SKT geçmişte mi (İstanbul günü; SKT günü dahil kullanılabilir). */
export function isStockBatchExpiryPast(expiryDate: string | null | undefined): boolean {
    return stockBatchExpiryStatus(toYmdOrNull(expiryDate), istanbulTodayYmdNow()) === 'expired';
}

/** Stok girişi parti bloğu (`BATCH_STOCK_API_CONTRACT.md` §4); tarihler `yyyy-MM-dd`, boş = `''`. */
export function createStockBatchFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group(
        {
            lotNumber: ['', Validators.maxLength(STOCK_BATCH_LOT_MAX)],
            expiryDate: [''],
            supplierName: ['', Validators.maxLength(STOCK_BATCH_SUPPLIER_MAX)],
            invoiceNumber: ['', Validators.maxLength(STOCK_BATCH_INVOICE_MAX)],
            invoiceDate: [''],
            receivedDate: [''],
            dispatchedDate: [''],
            transportMethod: ['', Validators.maxLength(STOCK_BATCH_TRANSPORT_MAX)],
            coldChainMonitor: ['', Validators.maxLength(STOCK_BATCH_TRANSPORT_MAX)],
            /** İstek gövdesine girmez; yalnız geçmiş SKT onayı (`acknowledgeExpired`). */
            acknowledgeExpired: [false]
        },
        { validators: [dispatchedNotAfterReceivedValidator, expiredAcknowledgedValidator] }
    );
}

export type StockBatchFormGroup = ReturnType<typeof createStockBatchFormGroup>;

/** Aşı / kontrollü ürün: seri/lot no ve SKT zorunlu (sözleşme §1, §4). */
export function applyStockBatchRequirement(group: StockBatchFormGroup, required: boolean): void {
    for (const control of [group.controls.lotNumber, group.controls.expiryDate]) {
        if (required) {
            control.addValidators(Validators.required);
        } else {
            control.removeValidators(Validators.required);
        }
        control.updateValueAndValidity({ emitEvent: false });
    }
    group.updateValueAndValidity({ emitEvent: false });
}

/** Parti bloğu yalnız stok girişinde (`active`) geçerlidir; pasifken doğrulamaya katılmaz. */
export function syncStockBatchGroup(group: StockBatchFormGroup, state: { active: boolean; required: boolean }): void {
    if (state.active) {
        group.enable({ emitEvent: false });
    } else {
        group.disable({ emitEvent: false });
    }
    applyStockBatchRequirement(group, state.active && state.required);
}

/** Geçmiş SKT'li giriş için istek bayrağı; SKT geçmiş değilse hiç gönderilmez. */
export function getAcknowledgeExpiredRequest(group: StockBatchFormGroup): { acknowledgeExpired?: true } {
    const v = group.getRawValue();
    return v.acknowledgeExpired && isStockBatchExpiryPast(v.expiryDate) ? { acknowledgeExpired: true } : {};
}

/** Hiç alan dolu değilse `null` (partisiz giriş); aksi halde sözleşme gövdesi. */
export function getStockBatchRequest(group: StockBatchFormGroup): StockMovementBatchRequest | null {
    const v = group.getRawValue();
    const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
    const batch: StockMovementBatchRequest = {
        lotNumber: orNull(v.lotNumber),
        expiryDate: orNull(v.expiryDate),
        supplierName: orNull(v.supplierName),
        invoiceNumber: orNull(v.invoiceNumber),
        invoiceDate: orNull(v.invoiceDate),
        receivedDate: orNull(v.receivedDate),
        dispatchedDate: orNull(v.dispatchedDate),
        transportMethod: orNull(v.transportMethod),
        coldChainMonitor: orNull(v.coldChainMonitor)
    };
    return Object.values(batch).every((x) => x === null) ? null : batch;
}

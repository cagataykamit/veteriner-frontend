import { AbstractControl, FormArray, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { dispatchedNotAfterReceivedValidator, isStockBatchExpiryPast, STOCK_BATCH_INVOICE_MAX, STOCK_BATCH_LOT_MAX, STOCK_BATCH_SUPPLIER_MAX, STOCK_BATCH_TRANSPORT_MAX } from '@/app/features/inventory/forms/stock-batch-form.factory';
import type { GoodsReceiptProductPick } from '@/app/features/inventory/models/goods-receipt-form.model';

/** Satır doğrulaması: ürün listeden seçilmiş, aşı/kontrollü ürünse seri+SKT dolu, geçmiş SKT satır başına onaylı. */
function goodsReceiptLineValidator(line: AbstractControl): ValidationErrors | null {
    const product = line.get('product')?.value as GoodsReceiptProductPick | string | null;
    const lot = String(line.get('lotNumber')?.value ?? '').trim();
    const expiry = String(line.get('expiryDate')?.value ?? '').trim();
    const errors: ValidationErrors = {};

    if (!product || typeof product === 'string') {
        errors['productMissing'] = true;
    } else if (product.requiresLotAndExpiry) {
        if (!lot) {
            errors['lotRequired'] = true;
        }

        if (!expiry) {
            errors['expiryRequired'] = true;
        }
    }

    if (isStockBatchExpiryPast(expiry) && line.get('acknowledgeExpired')?.value !== true) {
        errors['expiredNotAcknowledged'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
}

export function createGoodsReceiptLineGroup(fb: FormBuilder) {
    return fb.group(
        {
            product: [null as GoodsReceiptProductPick | string | null],
            quantity: [null as number | null, [Validators.required, Validators.min(0.0001)]],
            lotNumber: ['', Validators.maxLength(STOCK_BATCH_LOT_MAX)],
            expiryDate: [''],
            unitCost: [null as number | null, Validators.min(0)],
            acknowledgeExpired: [false]
        },
        { validators: [goodsReceiptLineValidator] }
    );
}

export type GoodsReceiptLineGroup = ReturnType<typeof createGoodsReceiptLineGroup>;

export function createGoodsReceiptFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group(
        {
            clinicId: ['', Validators.required],
            supplierName: ['', Validators.maxLength(STOCK_BATCH_SUPPLIER_MAX)],
            invoiceNumber: ['', Validators.maxLength(STOCK_BATCH_INVOICE_MAX)],
            invoiceDate: [''],
            receivedDate: [''],
            dispatchedDate: [''],
            transportMethod: ['', Validators.maxLength(STOCK_BATCH_TRANSPORT_MAX)],
            coldChainMonitor: ['', Validators.maxLength(STOCK_BATCH_TRANSPORT_MAX)],
            lines: new FormArray<GoodsReceiptLineGroup>([createGoodsReceiptLineGroup(fb)], Validators.required)
        },
        { validators: [dispatchedNotAfterReceivedValidator] }
    );
}

export type GoodsReceiptFormGroup = ReturnType<typeof createGoodsReceiptFormGroup>;

import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { createStockBatchFormGroup } from '@/app/features/inventory/forms/stock-batch-form.factory';

/** Ürün detayı — Klinik stokları tek dialog işlem tipi */
export type StockOperationKind = 'in' | 'out' | 'minimum';

/** Form sayısı: boş → `null`; virgüllü ondalık kabul edilir, sayı değilse `NaN`. */
function readFormNumber(raw: number | string | null | undefined): number | null {
    if (raw === null || raw === undefined || raw === '') {
        return null;
    }

    return typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
}

/** Miktar > 0 ise sayı, değilse `null`. */
export function parsePositiveFormNumber(raw: number | string | null | undefined): number | null {
    const n = readFormNumber(raw);

    return n !== null && Number.isFinite(n) && n > 0 ? n : null;
}

/** Boş değilse ve ≥ 0 ise sayı, değilse `null`. */
export function parseNonNegativeFormNumber(raw: number | string | null | undefined): number | null {
    const n = readFormNumber(raw);

    return n !== null && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Stok giriş/çıkış: miktar > 0 */
export function stockMovementAmountPositiveValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (readFormNumber(control.value as string | number | null | undefined) === null) {
            return { required: true };
        }

        return parsePositiveFormNumber(control.value as string | number | null | undefined) === null ? { minExclusive: true } : null;
    };
}

export function optionalNonNegativeNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value as string | number | null | undefined;

        return readFormNumber(raw) === null || parseNonNegativeFormNumber(raw) !== null ? null : { min: true };
    };
}

export function createProductStockOperationFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        clinicStockRowId: [null as string | null],
        operationType: fb.nonNullable.control<StockOperationKind>('in'),
        amount: [null as number | null],
        unitCost: [null as number | null],
        notes: ['', Validators.maxLength(2000)],
        minimumStockLevel: [null as number | null],
        batch: createStockBatchFormGroup(fb)
    });
}

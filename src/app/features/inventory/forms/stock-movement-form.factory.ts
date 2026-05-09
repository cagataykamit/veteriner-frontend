import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { parseDecimalFormInput } from '@/app/shared/utils/decimal-form.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import type {
    StockMovementFormMovementType,
    StockMovementUpsertFormValue
} from '@/app/features/inventory/models/stock-movement-form.model';

export const STOCK_MOVEMENT_CREATE_MOVEMENT_OPTIONS: readonly {
    label: string;
    value: StockMovementFormMovementType;
    hint: string;
}[] = [
    {
        label: 'Başlangıç stoğu',
        value: 'Initial',
        hint: 'Ürün için ilk stok miktarını girer.'
    },
    {
        label: 'Stok girişi',
        value: 'In',
        hint: 'Stoğu artırır.'
    },
    {
        label: 'Stok çıkışı',
        value: 'Out',
        hint: 'Stoğu azaltır.'
    },
    {
        label: 'Stok düzeltme',
        value: 'Adjustment',
        hint: 'Stok miktarını girilen değere eşitler.'
    }
];

export function stockMovementQuantityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const parent = control.parent;
        const type = parent?.get('movementType')?.value as StockMovementFormMovementType | undefined;
        const raw = control.value as string | number | null | undefined;
        const n = typeof raw === 'number' ? raw : parseDecimalFormInput(raw as string);
        if (n === null) {
            return { required: true };
        }
        if (type === 'Adjustment') {
            return n >= 0 ? null : { min: true };
        }
        return n > 0 ? null : { minExclusive: true };
    };
}

function optionalNonNegativeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value as string | number | null | undefined;
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        const n = typeof raw === 'number' ? raw : parseDecimalFormInput(String(raw));
        if (n === null) {
            return { invalidNumber: true };
        }
        return n >= 0 ? null : { min: true };
    };
}

export function createStockMovementFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        clinicId: ['', Validators.required],
        productId: ['', Validators.required],
        movementType: fb.nonNullable.control<StockMovementFormMovementType>('In', Validators.required),
        quantity: [null as number | null, [Validators.required, stockMovementQuantityValidator()]],
        unitCost: [null as number | null, optionalNonNegativeValidator()],
        reason: [''],
        occurredAtUtcLocal: [''],
        notes: ['']
    });
}

export type StockMovementFormGroup = ReturnType<typeof createStockMovementFormGroup>;

/** Reactive form → domain value (`mapStockMovementUpsertFormValueToCreateRequest` için). */
export function getStockMovementFormValue(form: StockMovementFormGroup): StockMovementUpsertFormValue {
    const v = form.getRawValue();
    const qRaw = v.quantity;
    const qty =
        typeof qRaw === 'number'
            ? qRaw
            : parseDecimalFormInput(qRaw === null || qRaw === undefined ? '' : String(qRaw));
    if (qty === null) {
        throw new Error('Miktar geçersiz.');
    }
    let unitCost: number | null = null;
    const ucRaw = v.unitCost;
    if (ucRaw !== null && ucRaw !== undefined) {
        if (typeof ucRaw === 'number') {
            unitCost = Number.isFinite(ucRaw) ? ucRaw : null;
        } else {
            const s = String(ucRaw).trim();
            if (s !== '') {
                unitCost = parseDecimalFormInput(s);
            }
        }
    }
    const iso = dateTimeLocalInputToIsoUtc(v.occurredAtUtcLocal?.trim() ?? '');
    const reasonT = v.reason?.trim() ?? '';
    const notesT = v.notes?.trim() ?? '';
    return {
        clinicId: v.clinicId.trim(),
        productId: v.productId.trim(),
        movementType: v.movementType,
        quantity: qty,
        unitCost: unitCost !== null && Number.isFinite(unitCost) ? unitCost : null,
        reason: reasonT === '' ? null : reasonT,
        occurredAtUtc: iso === '' ? null : iso,
        notes: notesT === '' ? null : notesT
    };
}

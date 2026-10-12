import { type AbstractControl, FormArray, FormControl, FormGroup, Validators, type ValidationErrors } from '@angular/forms';
import { CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, chargeNumberValidator } from '@/app/features/charges/utils/charge-amount.utils';
import type { PrescriptionItemInput } from '@/app/features/prescriptions/models/prescription-create.model';
import type { PrescriptionItemVm } from '@/app/features/prescriptions/models/prescription-vm.model';

/** Sözleşme sınırları (`PRESCRIPTION_ITEMS_API_CONTRACT.md` §1). */
export const PRESCRIPTION_ITEMS_MAX = 30;
export const PRESCRIPTION_ITEM_NAME_MAX = 200;
export const PRESCRIPTION_ITEM_INSTRUCTIONS_MAX = 1000;
export const PRESCRIPTION_ITEM_QUANTITY_MAX = CHARGE_QUANTITY_MAX;
export const PRESCRIPTION_ITEM_QUANTITY_MAX_DECIMALS = CHARGE_QUANTITY_MAX_DECIMALS;

export type PrescriptionItemFormGroup = FormGroup<{
    name: FormControl<string>;
    productId: FormControl<string>;
    instructions: FormControl<string>;
    quantity: FormControl<number | null>;
}>;

/** Ürün bağı yoksa ad zorunludur; ürün seçiliyse ad boş kalabilir (sunucu ürün adını kopyalar). */
function nameOrProductValidator(group: AbstractControl): ValidationErrors | null {
    const { name, productId } = (group as FormGroup).getRawValue() as { name: string | null; productId: string | null };
    return (name ?? '').trim() || (productId ?? '').trim() ? null : { nameOrProductRequired: true };
}

export function createPrescriptionItemGroup(value?: Partial<PrescriptionItemVm>): PrescriptionItemFormGroup {
    return new FormGroup(
        {
            name: new FormControl(value?.name ?? '', { nonNullable: true, validators: Validators.maxLength(PRESCRIPTION_ITEM_NAME_MAX) }),
            productId: new FormControl(value?.productId ?? '', { nonNullable: true }),
            instructions: new FormControl(value?.instructions ?? '', { nonNullable: true, validators: Validators.maxLength(PRESCRIPTION_ITEM_INSTRUCTIONS_MAX) }),
            quantity: new FormControl<number | null>(value?.quantity ?? null, chargeNumberValidator(PRESCRIPTION_ITEM_QUANTITY_MAX, PRESCRIPTION_ITEM_QUANTITY_MAX_DECIMALS))
        },
        { validators: nameOrProductValidator }
    );
}

export function createPrescriptionItemsArray(items: PrescriptionItemVm[] = []): FormArray<PrescriptionItemFormGroup> {
    return new FormArray(items.map((i) => createPrescriptionItemGroup(i)), { validators: (c) => ((c as FormArray).length > PRESCRIPTION_ITEMS_MAX ? { itemsMax: true } : null) });
}

/** Forma girilen satırları istek satırlarına çevirir (boş satır formu zaten geçersiz kılar). */
export function prescriptionItemsFormToInputs(array: FormArray<PrescriptionItemFormGroup>): PrescriptionItemInput[] {
    return array
        .getRawValue()
        .map((r) => ({
            name: r.name.trim(),
            productId: r.productId.trim() || null,
            instructions: r.instructions.trim() || null,
            quantity: r.quantity
        }));
}

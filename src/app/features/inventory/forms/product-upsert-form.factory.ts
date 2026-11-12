import { type AbstractControl, FormBuilder, type ValidationErrors, type ValidatorFn, Validators } from '@angular/forms';
import { hasAtMostDecimals } from '@/app/entities/charge/utils/charge-amount.utils';
import type { ProductControlledClassApi, ProductKindApi } from '@/app/entities/inventory/models/product-api.model';
import { taxRateValidator } from '@/app/shared/utils/turkish-tax-identity.utils';

export const PRODUCT_CLASSIFICATION_TEXT_MAX = 100;
/** Sözleşme: `Product.ManufacturerMaxLength`. */
export const PRODUCT_MANUFACTURER_MAX = 200;
/** Sözleşme: `Product.BarcodeMaxLength` (TIER-006). */
export const PRODUCT_BARCODE_MAX = 100;
/** Sözleşme §2.1: alış fiyatı ≥ 0, en çok 2 ondalık. */
export const PRODUCT_PURCHASE_PRICE_DECIMALS = 2;

export function createProductUpsertFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        productCategoryId: [''],
        sku: ['', Validators.maxLength(128)],
        barcode: ['', Validators.maxLength(PRODUCT_BARCODE_MAX)],
        unit: ['', [Validators.required, Validators.maxLength(64)]],
        unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
        currency: ['TRY', Validators.required],
        description: ['', Validators.maxLength(4000)],
        kind: fb.nonNullable.control<ProductKindApi>('Other'),
        controlledClass: fb.nonNullable.control<ProductControlledClassApi>('None'),
        pharmacologicalForm: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)],
        presentationForm: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)],
        packaging: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)],
        manufacturer: ['', Validators.maxLength(PRODUCT_MANUFACTURER_MAX)],
        /** `null` = klinik varsayılanı (`BATCH_STOCK_API_CONTRACT.md` §2.1). */
        vatRate: [null as number | null, taxRateValidator()],
        purchasePrice: [null as number | null, [Validators.min(0), maxDecimalsValidator(PRODUCT_PURCHASE_PRICE_DECIMALS)]]
    });
}

/** Boş geçerli; doluysa en çok `decimals` ondalık (`decimals` hatası). */
function maxDecimalsValidator(decimals: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value as number | null;

        return v == null || hasAtMostDecimals(v, decimals) ? null : { decimals: { decimals } };
    };
}

export type ProductUpsertFormGroup = ReturnType<typeof createProductUpsertFormGroup>;

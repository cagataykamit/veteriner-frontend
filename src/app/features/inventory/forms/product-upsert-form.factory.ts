import { FormBuilder, Validators } from '@angular/forms';
import type { ProductControlledClassApi, ProductKindApi } from '@/app/entities/inventory/models/product-api.model';

export const PRODUCT_CLASSIFICATION_TEXT_MAX = 100;

export function createProductUpsertFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        productCategoryId: [''],
        sku: ['', Validators.maxLength(128)],
        barcode: ['', Validators.maxLength(128)],
        unit: ['', [Validators.required, Validators.maxLength(64)]],
        unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
        currency: ['TRY', Validators.required],
        description: ['', Validators.maxLength(4000)],
        kind: fb.nonNullable.control<ProductKindApi>('Other'),
        controlledClass: fb.nonNullable.control<ProductControlledClassApi>('None'),
        pharmacologicalForm: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)],
        presentationForm: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)],
        packaging: ['', Validators.maxLength(PRODUCT_CLASSIFICATION_TEXT_MAX)]
    });
}

export type ProductUpsertFormGroup = ReturnType<typeof createProductUpsertFormGroup>;

import { FormBuilder, Validators } from '@angular/forms';

export function createProductUpsertFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        productCategoryId: [''],
        sku: ['', Validators.maxLength(128)],
        barcode: ['', Validators.maxLength(128)],
        unit: ['', [Validators.required, Validators.maxLength(64)]],
        unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
        currency: ['TRY', Validators.required],
        description: ['', Validators.maxLength(4000)]
    });
}

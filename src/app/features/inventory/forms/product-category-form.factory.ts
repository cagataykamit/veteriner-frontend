import { FormBuilder, Validators } from '@angular/forms';
import type { ProductCategoryFormValue } from '@/app/features/inventory/models/product-category-form.model';

/** Kategori adı / açıklama — ürün kategorisi dialog formu. */
export function createProductCategoryFormGroup(fb: FormBuilder) {
    return fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(200)]],
        description: ['', Validators.maxLength(2000)]
    });
}

export type ProductCategoryFormControls = ReturnType<typeof createProductCategoryFormGroup>;

export function getProductCategoryFormValue(form: ProductCategoryFormControls): ProductCategoryFormValue {
    const raw = form.getRawValue();
    return {
        name: typeof raw.name === 'string' ? raw.name.trim() : '',
        description: typeof raw.description === 'string' ? raw.description.trim() : ''
    };
}

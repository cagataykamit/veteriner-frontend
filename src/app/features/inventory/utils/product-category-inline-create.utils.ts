import type { WritableSignal } from '@angular/core';
import { map } from 'rxjs';
import type { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import type { InlineCreateConfig } from '@/app/shared/forms/inline-create/inline-create.directive';

/** Ürün formundaki kategori seçicisinde yerinde ekleme (O1): adla oluşur, listeye girer ve seçilir. */
export function productCategoryInlineCreate(service: ProductCategoryService, canCreate: boolean, options: WritableSignal<SelectOption[]>): InlineCreateConfig {
    return {
        canCreate,
        create: (name) =>
            service.create({ name: name.trim() }).pipe(
                map((dto) => {
                    options.update((o) => [...o, { value: dto.id, label: dto.name ?? name.trim() }]);

                    return dto.id;
                })
            )
    };
}

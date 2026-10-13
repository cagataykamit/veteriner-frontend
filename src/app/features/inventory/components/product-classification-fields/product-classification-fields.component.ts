import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PRODUCT_CLASSIFICATION_TEXT_MAX, type ProductUpsertFormGroup } from '@/app/features/inventory/forms/product-upsert-form.factory';
import {
    PRODUCT_CONTROLLED_CLASS_OPTIONS,
    PRODUCT_KIND_OPTIONS,
    productRequiresLotAndExpiry
} from '@/app/features/inventory/utils/product-classification.utils';

/** Ürün create/edit formunun sınıflandırma alanları: tür, kontrollü sınıf, farmakolojik/takdim şekli, ambalaj (`BATCH_STOCK_API_CONTRACT.md` §2). */
@Component({
    selector: 'app-product-classification-fields',
    standalone: true,
    imports: [ReactiveFormsModule, InputTextModule, SelectModule],
    template: `
        <div [formGroup]="form()" class="contents">
            <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                <label [for]="idPrefix() + 'Kind'" class="block text-sm font-medium text-muted-color">Ürün türü</label>
                <p-select
                    [inputId]="idPrefix() + 'Kind'"
                    formControlName="kind"
                    [options]="kindOptions"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="w-full"
                />
            </div>
            <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                <label [for]="idPrefix() + 'ControlledClass'" class="block text-sm font-medium text-muted-color">Kontrollü ürün sınıfı</label>
                <p-select
                    [inputId]="idPrefix() + 'ControlledClass'"
                    formControlName="controlledClass"
                    [options]="controlledClassOptions"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="w-full"
                />
            </div>
            @if (requiresLot()) {
                <p class="col-span-12 text-sm text-muted-color m-0" role="note">
                    Bu ürün için stok girişinde seri/lot no ve son kullanma tarihi zorunlu olacak.
                </p>
            }
            <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                <label [for]="idPrefix() + 'PharmaForm'" class="block text-sm font-medium text-muted-color">Farmakolojik şekil</label>
                <input [id]="idPrefix() + 'PharmaForm'" pInputText class="w-full" type="text" formControlName="pharmacologicalForm" autocomplete="off" placeholder="örn. Enjeksiyonluk çözelti" [attr.maxlength]="textMax" />
            </div>
            <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                <label [for]="idPrefix() + 'Presentation'" class="block text-sm font-medium text-muted-color">Takdim şekli</label>
                <input [id]="idPrefix() + 'Presentation'" pInputText class="w-full" type="text" formControlName="presentationForm" autocomplete="off" placeholder="örn. Flakon" [attr.maxlength]="textMax" />
            </div>
            <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                <label [for]="idPrefix() + 'Packaging'" class="block text-sm font-medium text-muted-color">Ambalaj</label>
                <input [id]="idPrefix() + 'Packaging'" pInputText class="w-full" type="text" formControlName="packaging" autocomplete="off" placeholder="örn. 10 ml flakon" [attr.maxlength]="textMax" />
            </div>
        </div>
    `
})
export class ProductClassificationFieldsComponent {
    readonly form = input.required<ProductUpsertFormGroup>();
    /** Aynı sayfada tekrar kullanımda benzersiz id'ler için. */
    readonly idPrefix = input('product');

    protected readonly kindOptions = PRODUCT_KIND_OPTIONS;
    protected readonly controlledClassOptions = PRODUCT_CONTROLLED_CLASS_OPTIONS;
    protected readonly textMax = PRODUCT_CLASSIFICATION_TEXT_MAX;

    protected requiresLot(): boolean {
        const { kind, controlledClass } = this.form().getRawValue();
        return productRequiresLotAndExpiry(kind, controlledClass);
    }
}

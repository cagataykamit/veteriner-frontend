import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { chargeVatRateOptionsIncluding } from '@/app/entities/charge/utils/charge-tax.utils';
import { PRODUCT_PURCHASE_PRICE_DECIMALS, type ProductUpsertFormGroup } from '@/app/features/inventory/forms/product-upsert-form.factory';

/**
 * Ürün create/edit formunun KDV oranı ve alış fiyatı alanları (`BATCH_STOCK_API_CONTRACT.md` §2.1).
 * KDV seçenekleri ücret formlarıyla aynı listedir; "Klinik varsayılanı" = `null`. Alış fiyatı bilgi amaçlıdır.
 */
@Component({
    selector: 'app-product-tax-fields',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule],
    host: { class: 'contents' },
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div [formGroup]="form()" class="contents">
            <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                <label [for]="idPrefix() + 'VatRate'" class="block text-sm font-medium text-muted-color">KDV oranı</label>
                <p-select [inputId]="idPrefix() + 'VatRate'" formControlName="vatRate" [options]="vatOptions()" optionLabel="label" optionValue="value" class="w-full" />
                <small class="text-muted-color">Bu üründen oluşan ücrete yazılır.</small>
            </div>
            <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                <label [for]="idPrefix() + 'PurchasePrice'" class="block text-sm font-medium text-muted-color">Alış fiyatı (TL)</label>
                <input [id]="idPrefix() + 'PurchasePrice'" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="purchasePrice" />
                @if (form().controls.purchasePrice.invalid && form().controls.purchasePrice.touched) {
                    <small class="text-danger">0 veya daha büyük, en fazla {{ purchasePriceDecimals }} ondalıklı bir fiyat girin.</small>
                } @else {
                    <small class="text-muted-color">Bilgi amaçlıdır; stok değeri ve ücret hesabında kullanılmaz.</small>
                }
            </div>
        </div>
    `
})
export class ProductTaxFieldsComponent {
    readonly form = input.required<ProductUpsertFormGroup>();
    /** Aynı sayfada tekrar kullanımda benzersiz id'ler için. */
    readonly idPrefix = input('product');
    /** Kayıtlı oran listede yoksa (ör. içe aktarılmış %18) seçenek olarak eklenir. */
    readonly currentVatRate = input<number | null>(null);

    protected readonly purchasePriceDecimals = PRODUCT_PURCHASE_PRICE_DECIMALS;
    protected readonly vatOptions = computed(() => chargeVatRateOptionsIncluding(this.currentVatRate()));
}

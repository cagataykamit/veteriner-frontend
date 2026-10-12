import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import {
    createPrescriptionItemGroup,
    PRESCRIPTION_ITEM_INSTRUCTIONS_MAX,
    PRESCRIPTION_ITEM_NAME_MAX,
    PRESCRIPTION_ITEM_QUANTITY_MAX,
    PRESCRIPTION_ITEM_QUANTITY_MAX_DECIMALS,
    PRESCRIPTION_ITEMS_MAX,
    type PrescriptionItemFormGroup
} from '@/app/features/prescriptions/utils/prescription-items-form.utils';

/**
 * Reçete satırları editörü: serbest ad + opsiyonel katalog ürünü (D2). Birim/lot/son kullanma yoktur (D4); reçete stok düşmez.
 * Form durumu çağıran sayfadaki `FormArray`dedir; ürün listesi yalnız `Products.Read` izniyle yüklenir (yoksa yalnız serbest ad).
 */
@Component({
    selector: 'app-prescription-items-editor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule],
    template: `
        <div data-testid="prescription-items-editor">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span class="block text-sm font-medium text-muted-color">İlaç / ürün satırları</span>
                <p-button
                    type="button"
                    label="Satır ekle"
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    data-testid="prescription-item-add"
                    [disabled]="items().length >= max"
                    (onClick)="addRow()"
                />
            </div>
            <p class="text-sm text-muted-color mt-0 mb-3">
                Katalogda olmayan veya dışarıdan alınacak ilaç yalnız adla yazılabilir. Reçete stoktan düşmez; klinikte uygulanan ürün için muayene/tedavi kaydından "Uygulama ekle" kullanın.
            </p>
            @if (items().length === 0) {
                <p class="text-sm text-muted-color m-0" data-testid="prescription-items-empty">Satır yok; reçete yalnız serbest metin olarak kaydedilir.</p>
            }
            @for (g of items().controls; track g; let i = $index) {
                <div class="rounded-border border border-surface-200 dark:border-surface-700 p-3 mb-3" data-testid="prescription-item-row">
                    <div class="grid grid-cols-12 gap-3">
                        @if (canPickProduct) {
                            <div class="col-span-12 md:col-span-6">
                                <label [attr.for]="'rx-product-' + i" class="block text-xs font-medium text-muted-color mb-1">Katalog ürünü (isteğe bağlı)</label>
                                <p-select
                                    [inputId]="'rx-product-' + i"
                                    [formControl]="g.controls.productId"
                                    [options]="optionsFor(g)"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Katalogdan seç"
                                    [filter]="true"
                                    filterBy="label"
                                    [showClear]="true"
                                    appendTo="body"
                                    styleClass="w-full"
                                    (onChange)="onProductChange(g, $event.value)"
                                />
                            </div>
                        }
                        <div class="col-span-12" [class.md:col-span-6]="canPickProduct">
                            <label [attr.for]="'rx-name-' + i" class="block text-xs font-medium text-muted-color mb-1">Ad {{ g.controls.productId.value ? '' : '*' }}</label>
                            <input [id]="'rx-name-' + i" type="text" class="w-full p-inputtext p-component" [formControl]="g.controls.name" [attr.maxlength]="nameMax" />
                            @if (g.hasError('nameOrProductRequired') && (g.controls.name.touched || g.controls.productId.touched)) {
                                <small class="text-red-500">İlaç adı yazın veya katalogdan ürün seçin.</small>
                            }
                        </div>
                        <div class="col-span-12 sm:col-span-4">
                            <label [attr.for]="'rx-qty-' + i" class="block text-xs font-medium text-muted-color mb-1">
                                Miktar@if (unitFor(g)) { <span> ({{ unitFor(g) }})</span> }
                            </label>
                            <input [id]="'rx-qty-' + i" type="number" step="any" min="0" class="w-full p-inputtext p-component" [formControl]="g.controls.quantity" />
                            @if (g.controls.quantity.invalid && g.controls.quantity.touched) {
                                <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                            }
                        </div>
                        <div class="col-span-12 sm:col-span-8">
                            <label [attr.for]="'rx-instr-' + i" class="block text-xs font-medium text-muted-color mb-1">Kullanım talimatı</label>
                            <input [id]="'rx-instr-' + i" type="text" class="w-full p-inputtext p-component" [formControl]="g.controls.instructions" [attr.maxlength]="instructionsMax" placeholder="Örn. Günde 2 kez, 7 gün" />
                        </div>
                    </div>
                    <div class="flex justify-end mt-2">
                        <p-button type="button" label="Satırı sil" icon="pi pi-trash" size="small" severity="danger" [text]="true" data-testid="prescription-item-remove" (onClick)="removeRow(i)" />
                    </div>
                </div>
            }
            @if (items().length >= max) {
                <small class="text-muted-color">En fazla {{ max }} satır eklenebilir.</small>
            }
        </div>
    `
})
export class PrescriptionItemsEditorComponent implements OnInit {
    readonly items = input.required<FormArray<PrescriptionItemFormGroup>>();

    private readonly productService = inject(ProductService);
    private readonly auth = inject(AuthService);

    protected readonly max = PRESCRIPTION_ITEMS_MAX;
    protected readonly nameMax = PRESCRIPTION_ITEM_NAME_MAX;
    protected readonly instructionsMax = PRESCRIPTION_ITEM_INSTRUCTIONS_MAX;
    protected readonly quantityMax = PRESCRIPTION_ITEM_QUANTITY_MAX;
    protected readonly quantityDecimals = PRESCRIPTION_ITEM_QUANTITY_MAX_DECIMALS;

    readonly canPickProduct = this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM);
    private readonly products = signal<ProductListItemVm[]>([]);
    private readonly catalogOptions = computed(() =>
        this.products().map((p) => ({ value: p.id, label: p.sku && p.sku !== '—' ? `${p.name} (${p.sku})` : p.name }))
    );

    ngOnInit(): void {
        if (!this.canPickProduct) {
            return;
        }
        this.productService.getProducts({ page: 1, pageSize: 200, isActive: true }).subscribe({
            next: (r) => this.products.set(r.items),
            error: () => this.products.set([])
        });
    }

    addRow(): void {
        if (this.items().length < this.max) {
            this.items().push(createPrescriptionItemGroup());
        }
    }

    removeRow(index: number): void {
        this.items().removeAt(index);
    }

    /** Katalogdaki aktif ürünler; satır eski/pasif bir ürüne bağlıysa o ürün satırın kendi adıyla seçili kalır. */
    optionsFor(g: PrescriptionItemFormGroup): { value: string; label: string }[] {
        const id = g.controls.productId.value;
        const options = this.catalogOptions();
        return id && !options.some((o) => o.value === id) ? [{ value: id, label: g.controls.name.value || id }, ...options] : options;
    }

    unitFor(g: PrescriptionItemFormGroup): string {
        const id = g.controls.productId.value;
        return id ? (this.products().find((p) => p.id === id)?.unit ?? '') : '';
    }

    /** Ad boşken seçilen ürünün adı önerilir (sunucu da boş adı ürün adıyla doldurur). */
    onProductChange(g: PrescriptionItemFormGroup, productId: string | null): void {
        if (!productId) {
            g.controls.productId.setValue('');
            return;
        }
        if (!g.controls.name.value.trim()) {
            g.controls.name.setValue(this.products().find((p) => p.id === productId)?.name ?? '');
        }
    }
}

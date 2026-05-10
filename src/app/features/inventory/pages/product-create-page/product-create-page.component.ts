import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { mapProductCategoryDtoToSelectOption } from '@/app/features/inventory/data/product.mapper';
import { createProductUpsertFormGroup } from '@/app/features/inventory/forms/product-upsert-form.factory';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-product-create-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TextareaModule,
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/products" class="text-primary font-medium no-underline inline-block mb-4">← Ürün listesine dön</a>

        <app-page-header title="Yeni ürün" subtitle="Ürün ve Stok" description="Ürün kartı oluşturun." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; kayıt oluşturulamaz.
                </p>
            }
            @if (canReadCategories && categoryLoadHint()) {
                <p class="text-muted-color text-sm mt-0 mb-4" role="status">{{ categoryLoadHint() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    @if (canReadCategories) {
                        <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                            <label for="productCategoryId" class="block text-sm font-medium text-muted-color">Kategori</label>
                            <p-select
                                inputId="productCategoryId"
                                formControlName="productCategoryId"
                                [options]="categoryOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Kategori seçin (isteğe bağlı)"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                            />
                        </div>
                    }
                    <div [class]="canReadCategories ? 'col-span-12 md:col-span-6 flex flex-col gap-1' : 'col-span-12 flex flex-col gap-1'">
                        <label for="productName" class="block text-sm font-medium text-muted-color">Ürün adı *</label>
                        <input id="productName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" />
                        @if (form.controls.name.invalid && form.controls.name.touched) {
                            <small class="text-red-500">Ürün adı zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label for="sku" class="block text-sm font-medium text-muted-color">SKU</label>
                        <input id="sku" pInputText class="w-full" type="text" formControlName="sku" autocomplete="off" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label for="barcode" class="block text-sm font-medium text-muted-color">Barkod</label>
                        <input id="barcode" pInputText class="w-full" type="text" formControlName="barcode" autocomplete="off" />
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label for="unit" class="block text-sm font-medium text-muted-color">Birim *</label>
                        <input id="unit" pInputText class="w-full" type="text" formControlName="unit" placeholder="örn. Adet, Kutu" />
                        @if (form.controls.unit.invalid && form.controls.unit.touched) {
                            <small class="text-red-500">Birim zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label for="unitPrice" class="block text-sm font-medium text-muted-color">Birim fiyat *</label>
                        <input id="unitPrice" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                        @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                            @if (form.controls.unitPrice.hasError('required')) {
                                <small class="text-red-500">Birim fiyat zorunludur.</small>
                            } @else if (form.controls.unitPrice.hasError('min')) {
                                <small class="text-red-500">Birim fiyat 0’dan küçük olamaz.</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label for="currency" class="block text-sm font-medium text-muted-color">Para birimi *</label>
                        <p-select
                            inputId="currency"
                            formControlName="currency"
                            [options]="currencyOptions"
                            optionLabel="label"
                            optionValue="value"
                            styleClass="w-full"
                        />
                        @if (form.controls.currency.invalid && form.controls.currency.touched) {
                            <small class="text-red-500">Para birimi zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 flex flex-col gap-1">
                        <label for="description" class="block text-sm font-medium text-muted-color">Açıklama</label>
                        <textarea id="description" pTextarea rows="3" class="w-full" formControlName="description"></textarea>
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <p-button
                        type="submit"
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || ro.mutationBlocked()"
                    />
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="goList()"
                        [disabled]="submitting()"
                    />
                </div>
            </form>
        </div>
    `
})
export class ProductCreatePageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly productService = inject(ProductService);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canReadCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM);
    readonly categoryOptions = signal<SelectOption[]>([]);
    readonly categoryLoadHint = signal<string | null>(null);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly currencyOptions = [
        { label: 'TRY', value: 'TRY' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' }
    ];

    readonly form = createProductUpsertFormGroup(this.fb);

    ngOnInit(): void {
        if (!this.canReadCategories) {
            return;
        }
        this.categoryService.list({ page: 1, pageSize: 500, isActive: true }).subscribe({
            next: (r) => {
                this.categoryOptions.set((r.items ?? []).map(mapProductCategoryDtoToSelectOption));
            },
            error: () => {
                this.categoryLoadHint.set('Kategoriler yüklenemedi; ürünü kategori seçmeden kaydedebilirsiniz.');
                this.categoryOptions.set([]);
            }
        });
    }

    goList(): void {
        void this.router.navigateByUrl('/panel/products');
    }

    onSubmit(): void {
        if (this.form.invalid || this.submitting() || this.ro.mutationBlocked()) {
            this.form.markAllAsTouched();
            return;
        }
        const raw = this.form.getRawValue();
        const value: ProductUpsertFormValue = {
            name: raw.name,
            productCategoryId: raw.productCategoryId,
            sku: raw.sku,
            barcode: raw.barcode,
            unit: raw.unit,
            unitPrice: raw.unitPrice,
            currency: raw.currency,
            description: raw.description
        };
        this.submitting.set(true);
        this.submitError.set(null);
        this.productService.createFromFormValue(value).subscribe({
            next: (id) => {
                this.submitting.set(false);
                if (id?.trim()) {
                    void this.router.navigate(['/panel/products', id.trim()]);
                } else {
                    void this.router.navigateByUrl('/panel/products');
                }
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof Error) {
                    this.submitError.set(e.message);
                    return;
                }
                this.submitError.set(messageFromHttpError(e as never, 'Ürün oluşturulamadı.'));
            }
        });
    }
}

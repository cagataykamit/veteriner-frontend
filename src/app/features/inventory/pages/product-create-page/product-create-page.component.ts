import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { injectReturnTarget } from '@/app/shared/utils/return-target.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { mapProductCategoryListItemVmToSelectOption } from '@/app/features/inventory/data/product-category.mapper';
import { createProductUpsertFormGroup } from '@/app/features/inventory/forms/product-upsert-form.factory';
import type { ProductUpsertFormValue } from '@/app/entities/inventory/models/product-upsert-form.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { productCategoryInlineCreate } from '@/app/features/inventory/utils/product-category-inline-create.utils';
import { InlineCreateDirective } from '@/app/shared/forms/inline-create/inline-create.directive';
import { InlineCreateOptionComponent } from '@/app/shared/forms/inline-create/inline-create-option.component';
import { BarcodeScanButtonComponent } from '@/app/entities/inventory/components/barcode-scan-button.component';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_CREATE_CLAIM, PRODUCT_CATEGORIES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { ProductClassificationFieldsComponent } from '@/app/features/inventory/components/product-classification-fields/product-classification-fields.component';
import { ProductTaxFieldsComponent } from '@/app/features/inventory/components/product-tax-fields/product-tax-fields.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FocusFirstFieldDirective } from '@/app/shared/ui/focus-first-field/focus-first-field.directive';
import type { HasUnsavedChanges } from '@/app/shared/ui/unsaved-changes/unsaved-changes';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { FormFieldComponent } from '@/app/shared/forms/form-field/form-field.component';

@Component({
    selector: 'app-product-create-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, AppPageHeaderComponent, BarcodeScanButtonComponent, ProductTaxFieldsComponent, ProductClassificationFieldsComponent, InlineCreateDirective, InlineCreateOptionComponent, FocusFirstFieldDirective, FormFieldComponent, FormSubmitDirective, FormErrorSummaryComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/products" categoryLinkLabel="Ürün listesine dön" title="Yeni ürün" description="Ürün kartı oluşturun." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; kayıt oluşturulamaz.</p>
            }
            @if (canReadCategories && categoryLoadHint()) {
                <p class="text-muted-color text-sm mt-0 mb-4" role="status">{{ categoryLoadHint() }}</p>
            }
            <form appFormSubmit appFocusFirstField [formGroup]="form" (ngSubmit)="onSubmit()">
                <app-form-error-summary />
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
                                filterPlaceholder="Ara…"
                                filterBy="label"
                                [showClear]="true"
                                [appInlineCreate]="categoryCreate()"
                                class="w-full"
                            >
                                <ng-template #emptyfilter><app-inline-create-option /></ng-template>
                                <ng-template #empty><app-inline-create-option emptyText="Henüz ürün kategorisi yok." /></ng-template>
                            </p-select>
                        </div>
                    }
                    <div [class]="canReadCategories ? 'col-span-12 md:col-span-6 flex flex-col gap-1' : 'col-span-12 flex flex-col gap-1'">
                        <label for="productName" class="block text-sm font-medium text-muted-color">Ürün adı *</label>
                        <input id="productName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" />
                        @if (form.controls.name.invalid && form.controls.name.touched) {
                            <small class="text-danger">Ürün adı zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label for="sku" class="block text-sm font-medium text-muted-color">SKU</label>
                        <input id="sku" pInputText class="w-full" type="text" formControlName="sku" autocomplete="off" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label for="barcode" class="block text-sm font-medium text-muted-color">Barkod</label>
                        <div class="flex gap-2">
                            <input id="barcode" pInputText class="flex-1 min-w-0" type="text" formControlName="barcode" autocomplete="off" />
                            <app-barcode-scan-button (scanned)="form.controls.barcode.setValue($event)" />
                        </div>
                    </div>
                    <app-form-field class="col-span-12 md:col-span-4" label="Birim" fieldId="unit" [error]="form.controls.unit.invalid && form.controls.unit.touched ? 'Birim zorunludur.' : null" [required]="true">
                        <input id="unit" pInputText class="w-full" type="text" formControlName="unit" placeholder="örn. Adet, Kutu" />
                    </app-form-field>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label for="unitPrice" class="block text-sm font-medium text-muted-color">Birim fiyat *</label>
                        <input id="unitPrice" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                        @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                            @if (form.controls.unitPrice.hasError('required')) {
                                <small class="text-danger">Birim fiyat zorunludur.</small>
                            } @else if (form.controls.unitPrice.hasError('min')) {
                                <small class="text-danger">Birim fiyat 0’dan küçük olamaz.</small>
                            }
                        }
                    </div>
                    <app-form-field class="col-span-12 md:col-span-4" label="Para birimi" fieldId="currency" [error]="form.controls.currency.invalid && form.controls.currency.touched ? 'Para birimi zorunludur.' : null" [required]="true">
                        <p-select inputId="currency" formControlName="currency" [options]="currencyOptions" optionLabel="label" optionValue="value" class="w-full" />
                    </app-form-field>
                    <app-product-tax-fields [form]="form" idPrefix="product" />
                    <app-product-classification-fields [form]="form" idPrefix="product" />
                    <div class="col-span-12 flex flex-col gap-1">
                        <label for="description" class="block text-sm font-medium text-muted-color">Açıklama</label>
                        <textarea id="description" pTextarea rows="3" class="w-full" formControlName="description"></textarea>
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-danger mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <button pButton type="submit" [disabled]="submitting() || ro.mutationBlocked()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                    <button pButton type="button" severity="secondary" (click)="goBack()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                </div>
            </form>
        </div>
    `
})
export class ProductCreatePageComponent implements OnInit, HasUnsavedChanges {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    /** İptal: geldiği yer (`returnUrl`, önceki sayfa, bağlamdaki kart), yoksa liste. */
    private readonly returnTarget = injectReturnTarget('/panel/products');
    private readonly productService = inject(ProductService);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canReadCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM);
    readonly canCreateCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_CREATE_CLAIM);
    readonly categoryOptions = signal<SelectOption[]>([]);
    /** Aranan kategori yoksa adıyla eklenir ve seçilir (O1). */
    readonly categoryCreate = computed(() => productCategoryInlineCreate(this.categoryService, this.canCreateCategories && !this.ro.mutationBlocked(), this.categoryOptions));
    readonly categoryLoadHint = signal<string | null>(null);
    readonly categoriesLoaded = signal(false);

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

        this.categoryService.list({ page: 1, pageSize: 200, isActive: true }).subscribe({
            next: (r) => {
                this.categoryOptions.set((r.items ?? []).map(mapProductCategoryListItemVmToSelectOption));
                this.categoriesLoaded.set(true);
            },
            error: () => {
                this.categoryLoadHint.set('Kategoriler yüklenemedi; ürünü kategori seçmeden kaydedebilirsiniz.');
                this.categoryOptions.set([]);
                this.categoriesLoaded.set(true);
            }
        });
    }

    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

    goBack(): void {
        void this.router.navigateByUrl(this.returnTarget.url);
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
            description: raw.description,
            kind: raw.kind,
            controlledClass: raw.controlledClass,
            pharmacologicalForm: raw.pharmacologicalForm,
            presentationForm: raw.presentationForm,
            packaging: raw.packaging,
            manufacturer: raw.manufacturer,
            vatRate: raw.vatRate,
            purchasePrice: raw.purchasePrice
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.productService.createFromFormValue(value).subscribe({
            next: (id) => {
                this.submitting.set(false);
                this.form.markAsPristine();

                if (id?.trim()) {
                    void this.router.navigate(['/panel/products', id.trim()], { queryParams: { saved: '1' } });
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

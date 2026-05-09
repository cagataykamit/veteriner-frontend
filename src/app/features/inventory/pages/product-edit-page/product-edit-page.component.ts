import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import {
    mapProductCategoryDtoToSelectOption,
    mapProductDtoToUpsertFormValue
} from '@/app/features/inventory/data/product.mapper';
import { createProductUpsertFormGroup } from '@/app/features/inventory/forms/product-upsert-form.factory';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { EMPTY, map, switchMap } from 'rxjs';

@Component({
    selector: 'app-product-edit-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a [routerLink]="productId() ? ['/panel/products', productId()!] : ['/panel/products']" class="text-primary font-medium no-underline inline-block mb-4">← Ürün detayına dön</a>

        <app-page-header title="Ürünü düzenle" subtitle="Ürün ve Stok" description="Ürün kartını güncelleyin." />

        @if (loading()) {
            <app-loading-state message="Ürün bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        İşletme salt okunur moddadır; değişiklik kaydedilemez.
                    </p>
                }
                @if (canReadCategories && categoryLoadHint()) {
                    <p class="text-muted-color text-sm mt-0 mb-4" role="status">{{ categoryLoadHint() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        @if (canReadCategories) {
                            <div class="col-span-12 md:col-span-6">
                                <label for="productCategoryIdEdit" class="block text-sm font-medium text-muted-color mb-2">Kategori</label>
                                <p-select
                                    inputId="productCategoryIdEdit"
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
                        <div [class]="canReadCategories ? 'col-span-12 md:col-span-6' : 'col-span-12'">
                            <label for="productNameEdit" class="block text-sm font-medium text-muted-color mb-2">Ürün adı *</label>
                            <input id="productNameEdit" type="text" class="w-full p-inputtext p-component" formControlName="name" autocomplete="off" />
                            @if (form.controls.name.invalid && form.controls.name.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="skuEdit" class="block text-sm font-medium text-muted-color mb-2">SKU</label>
                            <input id="skuEdit" type="text" class="w-full p-inputtext p-component" formControlName="sku" autocomplete="off" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="barcodeEdit" class="block text-sm font-medium text-muted-color mb-2">Barkod</label>
                            <input id="barcodeEdit" type="text" class="w-full p-inputtext p-component" formControlName="barcode" autocomplete="off" />
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="unitEdit" class="block text-sm font-medium text-muted-color mb-2">Birim *</label>
                            <input id="unitEdit" type="text" class="w-full p-inputtext p-component" formControlName="unit" />
                            @if (form.controls.unit.invalid && form.controls.unit.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="unitPriceEdit" class="block text-sm font-medium text-muted-color mb-2">Birim fiyat *</label>
                            <input id="unitPriceEdit" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                            @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                                <small class="text-red-500">0 veya üzeri geçerli tutar girin.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-4">
                            <label for="currencyEdit" class="block text-sm font-medium text-muted-color mb-2">Para birimi *</label>
                            <p-select
                                inputId="currencyEdit"
                                formControlName="currency"
                                [options]="currencyOptions"
                                optionLabel="label"
                                optionValue="value"
                                styleClass="w-full"
                            />
                        </div>
                        <div class="col-span-12">
                            <label for="descriptionEdit" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                            <textarea id="descriptionEdit" rows="3" class="w-full p-inputtext p-component" formControlName="description"></textarea>
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
                            (onClick)="goDetail()"
                            [disabled]="submitting()"
                        />
                    </div>
                </form>
            </div>
        }
    `
})
export class ProductEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly productService = inject(ProductService);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canReadCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM);
    readonly categoryOptions = signal<SelectOption[]>([]);
    readonly categoryLoadHint = signal<string | null>(null);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly productId = signal<string | null>(null);

    readonly currencyOptions = [
        { label: 'TRY', value: 'TRY' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' }
    ];

    readonly form = createProductUpsertFormGroup(this.fb);

    ngOnInit(): void {
        if (this.canReadCategories) {
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

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id')?.trim();
                    if (!id) {
                        this.loadError.set('Geçersiz ürün.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.loading.set(true);
                    this.loadError.set(null);
                    return this.productService.getDtoById(id).pipe(map((dto) => ({ id, dto })));
                })
            )
            .subscribe({
                next: ({ id, dto }) => {
                    this.productId.set(id);
                    this.form.reset(mapProductDtoToUpsertFormValue(dto));
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.loadError.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    reload(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? this.productId();
        if (!id) {
            return;
        }
        this.loading.set(true);
        this.loadError.set(null);
        this.productService.getDtoById(id).subscribe({
            next: (dto) => {
                this.form.reset(mapProductDtoToUpsertFormValue(dto));
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    goDetail(): void {
        const id = this.productId();
        if (id) {
            void this.router.navigate(['/panel/products', id]);
        } else {
            void this.router.navigateByUrl('/panel/products');
        }
    }

    onSubmit(): void {
        const id = this.productId();
        if (!id || this.form.invalid || this.submitting() || this.ro.mutationBlocked()) {
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
        this.productService.updateFromFormValue(id, value).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/products', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof Error) {
                    this.submitError.set(e.message);
                    return;
                }
                this.submitError.set(messageFromHttpError(e as never, 'Ürün güncellenemedi.'));
            }
        });
    }
}

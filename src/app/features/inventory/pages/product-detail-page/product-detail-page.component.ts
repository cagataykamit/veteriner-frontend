import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import type { ProductDetailVm } from '@/app/features/inventory/models/product-vm.model';
import type { ProductStockVm } from '@/app/features/inventory/models/product-stock-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PRODUCTS_DEACTIVATE_CLAIM,
    PRODUCTS_UPDATE_CLAIM,
    STOCK_MOVEMENTS_CREATE_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { EMPTY, switchMap } from 'rxjs';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';

@Component({
    selector: 'app-product-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    styles: [
        `
            /* Klinik stokları: 6 eşit kolon, dikey çizgi yok */
            .product-stock-desktop-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                column-gap: 1rem;
                align-items: center;
            }
        `
    ],
    template: `
        <a routerLink="/panel/products" class="text-primary font-medium no-underline inline-block mb-4">← Ürün listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Ürün yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (product(); as p) {
            <app-page-header title="Ürün detayı" subtitle="Ürün ve Stok" [description]="p.name + ' · ' + p.sku">
                @if (canUpdateProduct && !ro.mutationBlocked()) {
                    <a
                        actions
                        [routerLink]="['/panel/products', p.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                } @else if (canUpdateProduct && ro.mutationBlocked()) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Düzenle (salt okunur)"
                        icon="pi pi-lock"
                        [disabled]="true"
                        class="p-button-secondary"
                    ></button>
                }
                @if (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Pasifleştir"
                        icon="pi pi-ban"
                        severity="danger"
                        class="p-button-secondary"
                        [loading]="mutationBusy()"
                        [disabled]="mutationBusy()"
                        (onClick)="onDeactivateClick()"
                    ></button>
                }
                @if (canUpdateProduct && !ro.mutationBlocked() && !p.isActive) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Aktifleştir"
                        icon="pi pi-check"
                        class="p-button-secondary"
                        [loading]="mutationBusy()"
                        [disabled]="mutationBusy()"
                        (onClick)="onActivateClick()"
                    ></button>
                }
            </app-page-header>

            @if (mutationError()) {
                <p class="text-red-500 text-sm mb-4 m-0" role="alert">{{ mutationError() }}</p>
            }

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün adı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.name }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">SKU</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.sku }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Barkod</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.barcode }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Kategori</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.categoryName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.unit }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Birim fiyat</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.unitPriceText }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Para birimi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ p.currency }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="p.statusLabel" [severity]="p.statusSeverity" />
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Açıklama</h5>
                        @if (p.description === emptyMark) {
                            <app-empty-state message="Açıklama yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ p.description }}</p>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <h5 class="mt-0 mb-0 text-base font-semibold text-surface-900 dark:text-surface-0">Klinik stokları</h5>
                            <div class="flex flex-wrap gap-3 items-center text-sm">
                                @if (canReadStockMovements) {
                                    <a
                                        [routerLink]="['/panel/products', p.id, 'stock-movements']"
                                        class="text-primary font-medium no-underline whitespace-nowrap"
                                        >Stok hareketleri →</a>
                                }
                                @if (canCreateStockMovement && !ro.mutationBlocked()) {
                                    <a
                                        [routerLink]="['/panel/products', p.id, 'stock-movements']"
                                        class="text-primary font-medium no-underline whitespace-nowrap"
                                        >Stok hareketi ekle →</a>
                                }
                            </div>
                        </div>
                        @if (canUpdateProduct && ro.mutationBlocked()) {
                            <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3 m-0" role="status">
                                Salt okunur modda minimum stok güncellenemez; stok bilgileri görüntülenebilir.
                            </p>
                        }
                        @if (stocksLoading()) {
                            <app-loading-state message="Stok bilgileri yükleniyor…" />
                        } @else if (stocksError()) {
                            <app-error-state [detail]="stocksError()!" (retry)="reloadStocks()" />
                        } @else if (stocksRowsView().total === 0) {
                            <app-empty-state message="Bu ürün için henüz stok kaydı yok." />
                        } @else {
                            <!-- Masaüstü: çizgisiz kolon hizası; yalnızca satır ayırıcıları -->
                            <div class="hidden md:block overflow-x-auto w-full">
                                <div class="w-full min-w-0">
                                    <div
                                        role="row"
                                        class="product-stock-desktop-grid px-2 py-2.5 border-b border-surface-200 dark:border-surface-700"
                                    >
                                        <span class="text-sm font-semibold text-muted-color text-center block">Klinik</span>
                                        <span class="text-sm font-semibold text-muted-color text-center block">Eldeki stok</span>
                                        <span class="text-sm font-semibold text-muted-color text-center block">Minimum stok</span>
                                        <span class="text-sm font-semibold text-muted-color text-center block">Durum</span>
                                        <span class="text-sm font-semibold text-muted-color text-center block px-1">Son güncelleme</span>
                                        <span class="text-sm font-semibold text-muted-color text-center block">İşlem</span>
                                    </div>
                                    @for (row of stocksRowsView().displayed; track row.id) {
                                        <div
                                            role="row"
                                            class="product-stock-desktop-grid px-2 py-2.5 border-b border-surface-200 dark:border-surface-700 last:border-b-0 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors duration-150"
                                        >
                                            <span
                                                class="font-semibold text-base text-surface-900 dark:text-surface-0 min-w-0 break-words leading-snug text-center block"
                                                >{{ row.clinicName }}</span>
                                            <span class="tabular-nums text-base font-medium text-surface-900 dark:text-surface-0 text-center block">{{
                                                row.quantityText
                                            }}</span>
                                            <span class="tabular-nums text-base text-surface-900 dark:text-surface-0 text-center block">{{
                                                row.minimumStockLevelText
                                            }}</span>
                                            <span class="flex justify-center items-center min-w-0 px-1">
                                                <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                            </span>
                                            <span
                                                class="text-muted-color text-base min-w-0 text-center block px-1 break-words leading-snug"
                                                [title]="row.updatedAtText"
                                                >{{ row.updatedAtText }}</span>
                                            <span class="flex justify-center items-center min-h-[2rem]">
                                                @if (canUpdateProduct && !ro.mutationBlocked()) {
                                                    <p-button
                                                        type="button"
                                                        label="Güncelle"
                                                        icon="pi pi-pencil"
                                                        size="small"
                                                        [outlined]="true"
                                                        severity="secondary"
                                                        styleClass="!py-1 !px-2 !text-sm whitespace-nowrap"
                                                        title="Minimum stok seviyesini güncelle"
                                                        (onClick)="openMinStockDialog(row)"
                                                    />
                                                }
                                            </span>
                                        </div>
                                    }
                                </div>
                            </div>
                            <div class="md:hidden space-y-2.5">
                                @for (row of stocksRowsView().displayed; track row.id) {
                                    <div
                                        class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 px-3 py-2.5 shadow-sm"
                                    >
                                        <div class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-2 leading-snug">
                                            {{ row.clinicName }}
                                        </div>
                                        <dl class="m-0 grid grid-cols-12 gap-x-2 gap-y-2">
                                            <dt class="col-span-5 text-muted-color text-sm">Eldeki stok</dt>
                                            <dd class="col-span-7 m-0 text-right tabular-nums text-base font-medium text-surface-900 dark:text-surface-0">
                                                {{ row.quantityText }}
                                            </dd>
                                            <dt class="col-span-5 text-muted-color text-sm">Minimum stok</dt>
                                            <dd class="col-span-7 m-0 text-right tabular-nums text-base text-surface-900 dark:text-surface-0">
                                                {{ row.minimumStockLevelText }}
                                            </dd>
                                            <dt class="col-span-5 text-muted-color text-sm self-center">Durum</dt>
                                            <dd class="col-span-7 m-0 flex justify-end items-center">
                                                <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                            </dd>
                                            <dt class="col-span-12 text-muted-color text-sm pt-0.5">Son güncelleme</dt>
                                            <dd class="col-span-12 m-0 text-muted-color text-base">{{ row.updatedAtText }}</dd>
                                        </dl>
                                        @if (canUpdateProduct && !ro.mutationBlocked()) {
                                            <div class="flex justify-end mt-2.5 pt-2 border-t border-surface-200 dark:border-surface-700">
                                                <p-button
                                                    type="button"
                                                    label="Güncelle"
                                                    icon="pi pi-pencil"
                                                    size="small"
                                                    [outlined]="true"
                                                    severity="secondary"
                                                    styleClass="!py-1 !px-2 !text-sm"
                                                    title="Minimum stok seviyesini güncelle"
                                                    (onClick)="openMinStockDialog(row)"
                                                />
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        }

        <p-dialog
            header="Minimum stok seviyesi"
            [modal]="true"
            [visible]="minStockDialogOpen()"
            (visibleChange)="onMinStockDialogVisibleChange($event)"
            [style]="{ width: 'min(28rem, 95vw)' }"
            [draggable]="false"
        >
            @if (editingStockRow(); as stock) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    {{ stock.clinicName }} — eldeki: <span class="tabular-nums">{{ stock.quantityText }}</span>
                </p>
                <form [formGroup]="minStockForm" (ngSubmit)="onMinStockSubmit()">
                    <div class="flex flex-col gap-4">
                        <div>
                            <label for="minStockLevelInput" class="block text-sm font-medium text-muted-color mb-2">Minimum seviye *</label>
                            <input
                                id="minStockLevelInput"
                                type="number"
                                step="any"
                                min="0"
                                class="w-full p-inputtext p-component"
                                formControlName="minimumStockLevel"
                            />
                            @if (minStockForm.controls.minimumStockLevel.invalid && minStockForm.controls.minimumStockLevel.touched) {
                                <small class="text-red-500">0 veya üzeri bir değer girin.</small>
                            }
                        </div>
                    </div>
                    @if (minStockSubmitError()) {
                        <p class="text-red-500 mt-4 mb-0 text-sm" role="alert">{{ minStockSubmitError() }}</p>
                    }
                    <div class="flex flex-wrap justify-end gap-2 mt-4">
                        <p-button type="button" label="İptal" severity="secondary" (onClick)="closeMinStockDialog()" [disabled]="minStockSubmitting()" />
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-check"
                            [loading]="minStockSubmitting()"
                            [disabled]="minStockForm.invalid || minStockSubmitting() || ro.mutationBlocked()"
                        />
                    </div>
                </form>
            }
        </p-dialog>
    `
})
export class ProductDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly productService = inject(ProductService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    readonly canDeactivateProduct = this.auth.hasOperationClaim(PRODUCTS_DEACTIVATE_CLAIM);
    readonly canReadStockMovements = this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM);
    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly product = signal<ProductDetailVm | null>(null);

    readonly mutationBusy = signal(false);
    readonly mutationError = signal<string | null>(null);

    readonly stocksLoading = signal(false);
    readonly stocksError = signal<string | null>(null);
    readonly stocksRows = signal<ProductStockVm[]>([]);
    readonly stocksRowsView = computed(() => sliceDetailRelatedList(this.stocksRows()));

    readonly minStockDialogOpen = signal(false);
    readonly editingStockRow = signal<ProductStockVm | null>(null);
    readonly minStockSubmitting = signal(false);
    readonly minStockSubmitError = signal<string | null>(null);

    readonly minStockForm = this.fb.nonNullable.group({
        minimumStockLevel: [null as number | null, [Validators.required, Validators.min(0)]]
    });

    private lastId: string | null = null;

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (!id) {
                        this.error.set('Geçersiz ürün.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    this.mutationError.set(null);
                    this.stocksRows.set([]);
                    this.stocksError.set(null);
                    return this.productService.getById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.product.set(x);
                    this.loading.set(false);
                    if (this.lastId) {
                        this.loadStocks(this.lastId);
                    }
                },
                error: (e: unknown) => {
                    this.error.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.productService.getById(this.lastId).subscribe({
            next: (x) => {
                this.product.set(x);
                this.loading.set(false);
                this.loadStocks(this.lastId!);
            },
            error: (e: unknown) => {
                this.error.set(panelHttpFailureMessage(e, 'Ürün yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    reloadStocks(): void {
        if (this.lastId) {
            this.loadStocks(this.lastId);
        }
    }

    private loadStocks(productId: string): void {
        this.stocksLoading.set(true);
        this.stocksError.set(null);
        this.productService.getStocksByProductId(productId).subscribe({
            next: (rows) => {
                this.stocksRows.set(rows);
                this.stocksLoading.set(false);
            },
            error: (e: Error) => {
                this.stocksError.set(e.message ?? 'Stok bilgileri yüklenemedi.');
                this.stocksLoading.set(false);
            }
        });
    }

    openMinStockDialog(row: ProductStockVm): void {
        if (!this.canUpdateProduct || this.ro.mutationBlocked()) {
            return;
        }
        this.editingStockRow.set(row);
        this.minStockForm.patchValue({ minimumStockLevel: row.minimumStockLevel });
        this.minStockSubmitError.set(null);
        this.minStockDialogOpen.set(true);
    }

    closeMinStockDialog(): void {
        this.minStockDialogOpen.set(false);
        this.editingStockRow.set(null);
        this.minStockSubmitError.set(null);
        this.minStockForm.reset({ minimumStockLevel: null });
    }

    onMinStockDialogVisibleChange(visible: boolean): void {
        this.minStockDialogOpen.set(visible);
        if (!visible) {
            this.editingStockRow.set(null);
            this.minStockSubmitError.set(null);
            this.minStockForm.reset({ minimumStockLevel: null });
        }
    }

    onMinStockSubmit(): void {
        const stock = this.editingStockRow();
        const pid = this.lastId;
        if (!stock || !pid || this.minStockForm.invalid || this.minStockSubmitting() || this.ro.mutationBlocked()) {
            this.minStockForm.markAllAsTouched();
            return;
        }
        const level = this.minStockForm.getRawValue().minimumStockLevel;
        if (level == null) {
            return;
        }
        this.minStockSubmitting.set(true);
        this.minStockSubmitError.set(null);
        this.productService.updateProductStockMinimumLevel(stock.id, level).subscribe({
            next: () => {
                this.minStockSubmitting.set(false);
                this.closeMinStockDialog();
                this.loadStocks(pid);
            },
            error: (e: Error) => {
                this.minStockSubmitting.set(false);
                this.minStockSubmitError.set(e.message ?? 'Minimum stok güncellenemedi.');
            }
        });
    }

    onDeactivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p?.isActive || this.ro.mutationBlocked() || !this.canDeactivateProduct) {
            return;
        }
        if (!window.confirm('Bu ürünü pasifleştirmek istediğinize emin misiniz?')) {
            return;
        }
        this.mutationBusy.set(true);
        this.mutationError.set(null);
        this.productService.deactivate(id).subscribe({
            next: () => {
                this.mutationBusy.set(false);
                this.reload();
            },
            error: (e: Error) => {
                this.mutationBusy.set(false);
                this.mutationError.set(e.message ?? 'Pasifleştirme başarısız.');
            }
        });
    }

    onActivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p || p.isActive || this.ro.mutationBlocked() || !this.canUpdateProduct) {
            return;
        }
        if (!window.confirm('Bu ürünü aktifleştirmek istediğinize emin misiniz?')) {
            return;
        }
        this.mutationBusy.set(true);
        this.mutationError.set(null);
        this.productService.activate(id).subscribe({
            next: () => {
                this.mutationBusy.set(false);
                this.reload();
            },
            error: (e: Error) => {
                this.mutationBusy.set(false);
                this.mutationError.set(e.message ?? 'Aktifleştirme başarısız.');
            }
        });
    }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import type { ProductDetailVm } from '@/app/features/inventory/models/product-vm.model';
import type { ProductStockVm } from '@/app/features/inventory/models/product-stock-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
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
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ConfirmationService } from 'primeng/api';

/** Stok giriş/çıkış: miktar > 0 */
function stockMovementAmountPositiveValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value as string | number | null | undefined;
        if (raw === null || raw === undefined || raw === '') {
            return { required: true };
        }
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) {
            return { minExclusive: true };
        }
        return null;
    };
}

function optionalNonNegativeNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const raw = control.value as string | number | null | undefined;
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) {
            return { min: true };
        }
        return null;
    };
}

/** Ürün detayı — Klinik stokları tek dialog işlem tipi */
type StockOperationKind = 'in' | 'out' | 'minimum';

@Component({
    selector: 'app-product-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        SelectButtonModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
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
                <div actions class="flex flex-wrap items-center gap-2 justify-end">
                    @if (canUpdateProduct && !ro.mutationBlocked()) {
                        <a
                            [routerLink]="['/panel/products', p.id, 'edit']"
                            pButton
                            type="button"
                            label="Düzenle"
                            icon="pi pi-pencil"
                            class="p-button-secondary"
                        ></a>
                    } @else if (canUpdateProduct && ro.mutationBlocked()) {
                        <button
                            pButton
                            type="button"
                            label="Düzenle (salt okunur)"
                            icon="pi pi-lock"
                            [disabled]="true"
                            class="p-button-secondary"
                        ></button>
                    }
                    @if (canOpenStockOperation()) {
                        <button
                            pButton
                            type="button"
                            label="Stok işlemi"
                            icon="pi pi-sync"
                            severity="primary"
                            styleClass="whitespace-nowrap"
                            [disabled]="isHeaderStockOperationDisabled()"
                            [title]="headerStockOperationTitle()"
                            (click)="openStockOperationFromHeader()"
                        ></button>
                    }
                    @if (canDeactivateProduct && !ro.mutationBlocked() && p.isActive) {
                        <button
                            pButton
                            type="button"
                            label="Pasifleştir"
                            icon="pi pi-ban"
                            severity="danger"
                            class="p-button-secondary"
                            [loading]="mutationBusy()"
                            [disabled]="mutationBusy()"
                            (click)="onDeactivateClick()"
                        ></button>
                    }
                    @if (canUpdateProduct && !ro.mutationBlocked() && !p.isActive) {
                        <button
                            pButton
                            type="button"
                            label="Aktifleştir"
                            icon="pi pi-check"
                            class="p-button-secondary"
                            [loading]="mutationBusy()"
                            [disabled]="mutationBusy()"
                            (click)="onActivateClick()"
                        ></button>
                    }
                </div>
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
                        @if (ro.mutationBlocked()) {
                            <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-3 m-0" role="status">
                                Salt okunur modda stok girişi, stok çıkışı ve minimum stok güncellenemez; stok bilgileri görüntülenebilir.
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
                                            <span class="flex justify-center items-center min-h-[2.5rem] max-w-full">
                                                @if (canOpenStockOperation()) {
                                                    <p-button
                                                        type="button"
                                                        label="Stok işlemi"
                                                        icon="pi pi-sync"
                                                        size="small"
                                                        severity="primary"
                                                        styleClass="!py-2 !px-3 !text-sm !font-semibold whitespace-nowrap shadow-sm"
                                                        title="Stok girişi, çıkışı veya minimum stok"
                                                        (onClick)="openStockOperationDialog(row)"
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
                                        @if (canOpenStockOperation()) {
                                            <div class="flex flex-wrap justify-end gap-2 mt-2.5 pt-2 border-t border-surface-200 dark:border-surface-700">
                                                <p-button
                                                    type="button"
                                                    label="Stok işlemi"
                                                    icon="pi pi-sync"
                                                    size="small"
                                                    severity="primary"
                                                    styleClass="!py-2 !px-3 !text-sm !font-semibold shadow-sm"
                                                    title="Stok girişi, çıkışı veya minimum stok"
                                                    (onClick)="openStockOperationDialog(row)"
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
            header="Stok işlemi"
            [modal]="true"
            [visible]="stockOperationDialogOpen()"
            (visibleChange)="onStockOperationDialogVisibleChange($event)"
            [style]="{ width: 'min(36rem, 95vw)' }"
            [draggable]="false"
        >
            <form [formGroup]="stockOperationForm" (ngSubmit)="onStockOperationSubmit()" class="flex flex-col gap-4">
                @if (showStockClinicPicker()) {
                    <div class="flex flex-col gap-1">
                        <label for="soClinicPick" class="block text-sm font-medium text-muted-color">Klinik *</label>
                        <p-select
                            inputId="soClinicPick"
                            formControlName="clinicStockRowId"
                            [options]="stockRowPickOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Klinik seçin…"
                            [filter]="true"
                            filterBy="label"
                            [showClear]="true"
                            styleClass="w-full"
                        />
                        @if (stockOperationForm.controls.clinicStockRowId.invalid && stockOperationForm.controls.clinicStockRowId.touched) {
                            <small class="text-red-500">Stok işlemi için klinik seçimi gereklidir.</small>
                        }
                    </div>
                }

                @if (shouldShowStockOperationBody()) {
                    @if (editingStockRow(); as stock) {
                        <div
                            class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-4 space-y-3"
                            role="region"
                            aria-label="Klinik stok özeti"
                        >
                            <div class="flex flex-col gap-1">
                                <span class="block text-sm font-medium text-muted-color">Klinik</span>
                                <span class="text-base font-medium text-surface-900 dark:text-surface-0 leading-snug">{{ stock.clinicName }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Mevcut stok</span>
                                    <span class="text-base tabular-nums text-surface-900 dark:text-surface-0">{{ stock.quantityText }}</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Minimum stok</span>
                                    <span class="text-base tabular-nums text-surface-900 dark:text-surface-0">{{ stock.minimumStockLevelText }}</span>
                                </div>
                            </div>
                        </div>
                    } @else if (stockOperationActiveClinicFallback()) {
                        <div
                            class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-4 space-y-3"
                            role="region"
                            aria-label="Aktif klinik stok özeti"
                        >
                            <div class="flex flex-col gap-1">
                                <span class="block text-sm font-medium text-muted-color">Klinik</span>
                                <span class="text-base font-medium text-surface-900 dark:text-surface-0 leading-snug">{{ headerActiveClinicDisplayName() }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Mevcut stok</span>
                                    <span class="text-base tabular-nums text-muted-color">—</span>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="block text-sm font-medium text-muted-color">Minimum stok</span>
                                    <span class="text-base tabular-nums text-muted-color">—</span>
                                </div>
                            </div>
                            <p class="text-sm text-muted-color m-0 leading-relaxed">
                                Bu ürün için seçili klinikte henüz stok kaydı yok; stok girişi veya çıkışı ile hareket oluşturabilirsiniz.
                            </p>
                        </div>
                    }

                    <div class="flex flex-col gap-2">
                        <label class="block text-sm font-medium text-muted-color">İşlem tipi</label>
                        <p-selectbutton
                            formControlName="operationType"
                            [options]="stockOperationTypeSelectOptions()"
                            optionLabel="label"
                            optionValue="value"
                            [allowEmpty]="false"
                            styleClass="flex-wrap w-full"
                            aria-label="İşlem tipi"
                        />
                    </div>

                    @if (stockOperationForm.controls.operationType.value === 'in') {
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <label for="soAmountIn" class="block text-sm font-medium text-muted-color">Giriş miktarı *</label>
                                <input
                                    id="soAmountIn"
                                    type="number"
                                    step="any"
                                    min="0"
                                    class="w-full p-inputtext p-component"
                                    formControlName="amount"
                                    inputmode="decimal"
                                />
                                @if (stockOperationForm.controls.amount.invalid && stockOperationForm.controls.amount.touched) {
                                    <small class="text-red-500">Miktar 0’dan büyük olmalıdır.</small>
                                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="soUnitCost" class="block text-sm font-medium text-muted-color">Birim maliyet</label>
                                <input
                                    id="soUnitCost"
                                    type="number"
                                    step="any"
                                    min="0"
                                    class="w-full p-inputtext p-component"
                                    formControlName="unitCost"
                                    placeholder="İsteğe bağlı"
                                    inputmode="decimal"
                                />
                                @if (stockOperationForm.controls.unitCost.invalid && stockOperationForm.controls.unitCost.touched) {
                                    <small class="text-red-500">Birim maliyet 0’dan küçük olamaz.</small>
                                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="soNotesIn" class="block text-sm font-medium text-muted-color">Açıklama</label>
                                <textarea
                                    id="soNotesIn"
                                    pTextarea
                                    rows="3"
                                    class="w-full min-h-[4.5rem]"
                                    formControlName="notes"
                                    placeholder="İsteğe bağlı"
                                ></textarea>
                                @if (stockOperationForm.controls.notes.invalid && stockOperationForm.controls.notes.touched) {
                                    <small class="text-red-500">En fazla 2000 karakter.</small>
                                }
                            </div>
                        </div>
                    }
                    @if (stockOperationForm.controls.operationType.value === 'out') {
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-1">
                                <label for="soAmountOut" class="block text-sm font-medium text-muted-color">Çıkış miktarı *</label>
                                <input
                                    id="soAmountOut"
                                    type="number"
                                    step="any"
                                    min="0"
                                    class="w-full p-inputtext p-component"
                                    formControlName="amount"
                                    inputmode="decimal"
                                />
                                @if (stockOperationForm.controls.amount.invalid && stockOperationForm.controls.amount.touched) {
                                    <small class="text-red-500">Miktar 0’dan büyük olmalıdır.</small>
                                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <label for="soNotesOut" class="block text-sm font-medium text-muted-color">Açıklama</label>
                                <textarea
                                    id="soNotesOut"
                                    pTextarea
                                    rows="3"
                                    class="w-full min-h-[4.5rem]"
                                    formControlName="notes"
                                    placeholder="İsteğe bağlı"
                                ></textarea>
                                @if (stockOperationForm.controls.notes.invalid && stockOperationForm.controls.notes.touched) {
                                    <small class="text-red-500">En fazla 2000 karakter.</small>
                                }
                            </div>
                        </div>
                    }
                    @if (stockOperationForm.controls.operationType.value === 'minimum') {
                        <div class="flex flex-col gap-1">
                            <label for="soMinLevel" class="block text-sm font-medium text-muted-color">Yeni minimum stok *</label>
                            <input
                                id="soMinLevel"
                                type="number"
                                step="any"
                                min="0"
                                class="w-full p-inputtext p-component"
                                formControlName="minimumStockLevel"
                                inputmode="decimal"
                            />
                            @if (
                                stockOperationForm.controls.minimumStockLevel.invalid &&
                                stockOperationForm.controls.minimumStockLevel.touched
                            ) {
                                <small class="text-red-500">Minimum stok 0’dan küçük olamaz.</small>
                            }
                        </div>
                    }
                }

                @if (stockOperationSubmitError()) {
                    <p class="text-red-500 m-0 text-sm leading-relaxed" role="alert">{{ stockOperationSubmitError() }}</p>
                }
                <div
                    class="flex flex-wrap justify-end gap-2 pt-3 mt-1 border-t border-surface-200 dark:border-surface-700"
                >
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        severity="secondary"
                        (onClick)="closeStockOperationDialog()"
                        [disabled]="stockOperationSubmitting()"
                    />
                    <p-button
                        type="submit"
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="stockOperationSubmitting()"
                        [disabled]="
                            stockOperationForm.invalid ||
                            stockOperationSubmitting() ||
                            ro.mutationBlocked() ||
                            stockOperationPickIncomplete()
                        "
                    />
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ProductDetailPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly productService = inject(ProductService);
    private readonly stockMovementService = inject(StockMovementService);
    private readonly confirmationService = inject(ConfirmationService);
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

    readonly stockOperationDialogOpen = signal(false);
    readonly editingStockRow = signal<ProductStockVm | null>(null);
    readonly stockOperationSubmitting = signal(false);
    readonly stockOperationSubmitError = signal<string | null>(null);
    /** Üst aksiyondan açıldı ve birden fazla klinik satırı var — önce klinik seçimi */
    readonly stockOperationHeaderNeedsRowPick = signal(false);
    /** Ürün için stok satırı yok; aktif klinik üzerinden giriş/çıkış */
    readonly stockOperationActiveClinicFallback = signal(false);

    readonly stockOperationForm = this.fb.nonNullable.group({
        clinicStockRowId: [null as string | null],
        operationType: this.fb.nonNullable.control<StockOperationKind>('in'),
        amount: [null as number | null],
        unitCost: [null as number | null],
        notes: ['', Validators.maxLength(2000)],
        minimumStockLevel: [null as number | null]
    });

    private lastId: string | null = null;

    /** Salt okunur değil ve en az bir işlem hakkı (stok hareketi veya ürün güncelleme). */
    canOpenStockOperation(): boolean {
        return !this.ro.mutationBlocked() && (this.canCreateStockMovement || this.canUpdateProduct);
    }

    stockOperationTypeSelectOptions(): { label: string; value: StockOperationKind }[] {
        const o: { label: string; value: StockOperationKind }[] = [];
        if (this.canCreateStockMovement) {
            o.push({ label: 'Stok girişi', value: 'in' });
            o.push({ label: 'Stok çıkışı', value: 'out' });
        }
        const row = this.editingStockRow();
        if (this.canUpdateProduct && row) {
            o.push({ label: 'Minimum stok ayarla', value: 'minimum' });
        }
        return o;
    }

    showStockClinicPicker(): boolean {
        return this.stockOperationHeaderNeedsRowPick();
    }

    shouldShowStockOperationBody(): boolean {
        return this.editingStockRow() !== null || this.stockOperationActiveClinicFallback();
    }

    stockOperationPickIncomplete(): boolean {
        return this.stockOperationHeaderNeedsRowPick() && this.editingStockRow() === null;
    }

    headerActiveClinicDisplayName(): string {
        const name = this.auth.getClinicName()?.trim();
        const id = this.auth.getClinicId()?.trim();
        if (name) {
            return name;
        }
        if (id) {
            return id;
        }
        return '—';
    }

    /** Üst başlık Stok işlemi — stok listesi ve aktif klinik durumuna göre */
    isHeaderStockOperationDisabled(): boolean {
        if (!this.canOpenStockOperation()) {
            return true;
        }
        if (this.stocksLoading()) {
            return true;
        }
        const rows = this.stocksRows();
        if (rows.length === 0) {
            if (!this.auth.getClinicId()?.trim()) {
                return true;
            }
            if (!this.canCreateStockMovement) {
                return true;
            }
        }
        return false;
    }

    stockRowPickOptions(): { label: string; value: string }[] {
        return this.stocksRows().map((r) => ({ label: r.clinicName, value: r.id }));
    }

    headerStockOperationTitle(): string {
        if (this.isHeaderStockOperationDisabled() && this.stocksRows().length === 0 && !this.auth.getClinicId()?.trim()) {
            return 'Bu ürün için henüz klinik stok kaydı yok. İlk stok kaydı oluşturmak için klinik bilgisi gereklidir.';
        }
        if (this.isHeaderStockOperationDisabled() && this.stocksRows().length === 0 && !this.canCreateStockMovement) {
            return 'Stok girişi/çıkışı için yetki veya klinik bağlamı gerekli.';
        }
        return 'Stok girişi, çıkışı veya minimum stok';
    }

    openStockOperationFromHeader(): void {
        if (!this.canOpenStockOperation() || this.isHeaderStockOperationDisabled()) {
            return;
        }
        const rows = this.stocksRows();
        if (rows.length === 1) {
            this.openStockOperationDialog(rows[0]);
            return;
        }
        if (rows.length === 0) {
            const cid = this.auth.getClinicId()?.trim();
            if (!cid || !this.canCreateStockMovement) {
                return;
            }
            this.stockOperationHeaderNeedsRowPick.set(false);
            this.stockOperationActiveClinicFallback.set(true);
            this.editingStockRow.set(null);
            this.stockOperationSubmitError.set(null);
            this.clearClinicStockRowControl();
            const defaultOp = this.pickDefaultOperationType();
            this.stockOperationForm.reset(
                {
                    clinicStockRowId: null,
                    operationType: defaultOp,
                    amount: null,
                    unitCost: null,
                    notes: '',
                    minimumStockLevel: null
                },
                { emitEvent: false }
            );
            this.applyOperationTypeValidators(defaultOp);
            this.stockOperationDialogOpen.set(true);
            return;
        }
        this.stockOperationHeaderNeedsRowPick.set(true);
        this.stockOperationActiveClinicFallback.set(false);
        this.editingStockRow.set(null);
        this.stockOperationSubmitError.set(null);
        this.stockOperationForm.controls.clinicStockRowId.setValidators([Validators.required]);
        this.stockOperationForm.reset(
            {
                clinicStockRowId: null,
                operationType: 'in',
                amount: null,
                unitCost: null,
                notes: '',
                minimumStockLevel: null
            },
            { emitEvent: false }
        );
        this.stockOperationForm.controls.amount.clearValidators();
        this.stockOperationForm.controls.unitCost.clearValidators();
        this.stockOperationForm.controls.minimumStockLevel.clearValidators();
        this.stockOperationForm.controls.amount.updateValueAndValidity({ emitEvent: false });
        this.stockOperationForm.controls.unitCost.updateValueAndValidity({ emitEvent: false });
        this.stockOperationForm.controls.minimumStockLevel.updateValueAndValidity({ emitEvent: false });
        this.stockOperationForm.controls.clinicStockRowId.updateValueAndValidity({ emitEvent: false });
        this.stockOperationDialogOpen.set(true);
    }

    private clearClinicStockRowControl(): void {
        this.stockOperationForm.controls.clinicStockRowId.clearValidators();
        this.stockOperationForm.controls.clinicStockRowId.setValue(null, { emitEvent: false });
        this.stockOperationForm.controls.clinicStockRowId.updateValueAndValidity({ emitEvent: false });
    }

    private pickDefaultOperationType(): StockOperationKind {
        if (this.canCreateStockMovement) {
            return 'in';
        }
        return 'minimum';
    }

    private applyOperationTypeValidators(op: StockOperationKind): void {
        const amountCtrl = this.stockOperationForm.controls.amount;
        const unitCostCtrl = this.stockOperationForm.controls.unitCost;
        const minCtrl = this.stockOperationForm.controls.minimumStockLevel;

        if (op === 'minimum') {
            amountCtrl.clearValidators();
            unitCostCtrl.clearValidators();
            amountCtrl.setValue(null, { emitEvent: false });
            unitCostCtrl.setValue(null, { emitEvent: false });
            minCtrl.setValidators([Validators.required, Validators.min(0)]);
            const stock = this.editingStockRow();
            if (stock) {
                minCtrl.setValue(stock.minimumStockLevel, { emitEvent: false });
            }
        } else {
            minCtrl.clearValidators();
            minCtrl.setValue(null, { emitEvent: false });
            amountCtrl.setValidators([stockMovementAmountPositiveValidator()]);
            unitCostCtrl.setValidators([optionalNonNegativeNumberValidator()]);
            if (op === 'out') {
                unitCostCtrl.setValue(null, { emitEvent: false });
            }
        }
        amountCtrl.updateValueAndValidity({ emitEvent: false });
        unitCostCtrl.updateValueAndValidity({ emitEvent: false });
        minCtrl.updateValueAndValidity({ emitEvent: false });
    }

    ngOnInit(): void {
        this.stockOperationForm.controls.operationType.valueChanges.subscribe((op) => {
            if (!op) {
                return;
            }
            if (this.stockOperationHeaderNeedsRowPick() && !this.editingStockRow()) {
                return;
            }
            this.applyOperationTypeValidators(op);
        });

        this.stockOperationForm.controls.clinicStockRowId.valueChanges.subscribe((id) => {
            if (!this.stockOperationHeaderNeedsRowPick()) {
                return;
            }
            const row = id ? (this.stocksRows().find((r) => r.id === id) ?? null) : null;
            this.editingStockRow.set(row);
            if (row) {
                const op = this.stockOperationForm.controls.operationType.value;
                this.applyOperationTypeValidators(op);
            } else {
                this.stockOperationForm.controls.amount.clearValidators();
                this.stockOperationForm.controls.unitCost.clearValidators();
                this.stockOperationForm.controls.minimumStockLevel.clearValidators();
                this.stockOperationForm.controls.amount.updateValueAndValidity({ emitEvent: false });
                this.stockOperationForm.controls.unitCost.updateValueAndValidity({ emitEvent: false });
                this.stockOperationForm.controls.minimumStockLevel.updateValueAndValidity({ emitEvent: false });
            }
        });

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

    openStockOperationDialog(row: ProductStockVm): void {
        if (!this.canOpenStockOperation()) {
            return;
        }
        this.stockOperationHeaderNeedsRowPick.set(false);
        this.stockOperationActiveClinicFallback.set(false);
        this.clearClinicStockRowControl();
        this.editingStockRow.set(row);
        this.stockOperationSubmitError.set(null);
        const defaultOp = this.pickDefaultOperationType();
        this.stockOperationForm.reset(
            {
                clinicStockRowId: null,
                operationType: defaultOp,
                amount: null,
                unitCost: null,
                notes: '',
                minimumStockLevel: null
            },
            { emitEvent: false }
        );
        this.applyOperationTypeValidators(defaultOp);
        this.stockOperationDialogOpen.set(true);
    }

    closeStockOperationDialog(): void {
        this.stockOperationDialogOpen.set(false);
        this.stockOperationHeaderNeedsRowPick.set(false);
        this.stockOperationActiveClinicFallback.set(false);
        this.editingStockRow.set(null);
        this.stockOperationSubmitError.set(null);
        this.clearClinicStockRowControl();
        this.stockOperationForm.reset(
            {
                clinicStockRowId: null,
                operationType: 'in',
                amount: null,
                unitCost: null,
                notes: '',
                minimumStockLevel: null
            },
            { emitEvent: false }
        );
        this.applyOperationTypeValidators('in');
        this.stockOperationForm.markAsUntouched();
    }

    onStockOperationDialogVisibleChange(visible: boolean): void {
        if (!visible) {
            this.closeStockOperationDialog();
        }
    }

    private parsePositiveQuantity(raw: number | string | null | undefined): number | null {
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) {
            return null;
        }
        return n;
    }

    private parseOptionalNonNegativeUnitCost(raw: number | string | null | undefined): number | null {
        if (raw === null || raw === undefined || raw === '') {
            return null;
        }
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) {
            return null;
        }
        return n;
    }

    onStockOperationSubmit(): void {
        const productId = this.lastId;
        const op = this.stockOperationForm.getRawValue().operationType;

        if (!productId || this.stockOperationSubmitting() || this.ro.mutationBlocked()) {
            this.stockOperationForm.markAllAsTouched();
            return;
        }

        if (this.stockOperationPickIncomplete()) {
            this.stockOperationSubmitError.set('Stok işlemi için klinik seçimi gereklidir.');
            this.stockOperationForm.controls.clinicStockRowId.markAllAsTouched();
            return;
        }

        const stock = this.editingStockRow();
        const activeFallback = this.stockOperationActiveClinicFallback();

        if (!stock && !activeFallback) {
            this.stockOperationForm.markAllAsTouched();
            return;
        }

        if (op === 'in' || op === 'out') {
            if (!this.canCreateStockMovement) {
                this.stockOperationSubmitError.set('Bu işlem için yetkiniz yok.');
                return;
            }
        } else if (op === 'minimum') {
            if (!this.canUpdateProduct) {
                this.stockOperationSubmitError.set('Bu işlem için yetkiniz yok.');
                return;
            }
            if (!stock) {
                this.stockOperationSubmitError.set('Minimum stok için ilgili klinikte ürün stok kaydı gerekir.');
                return;
            }
        }

        if (this.stockOperationForm.invalid) {
            this.stockOperationForm.markAllAsTouched();
            return;
        }

        const raw = this.stockOperationForm.getRawValue();

        if (op === 'in' || op === 'out') {
            const amount = this.parsePositiveQuantity(raw.amount);
            if (amount == null) {
                this.stockOperationForm.markAllAsTouched();
                return;
            }
            const notesTrimmed = raw.notes?.trim() ?? '';
            const defaultReason = op === 'in' ? 'Stok girişi' : 'Stok çıkışı';
            const unitCost =
                op === 'in' ? this.parseOptionalNonNegativeUnitCost(raw.unitCost as number | string | null | undefined) : null;

            let clinicId: string | null = null;
            if (activeFallback) {
                clinicId = this.auth.getClinicId()?.trim() ?? null;
                if (!clinicId) {
                    this.stockOperationSubmitError.set('Stok işlemi için klinik bilgisi gerekli.');
                    return;
                }
            } else if (stock) {
                clinicId = stock.clinicId;
            }
            if (!clinicId) {
                this.stockOperationSubmitError.set('Stok işlemi için klinik bilgisi gerekli.');
                return;
            }

            this.stockOperationSubmitting.set(true);
            this.stockOperationSubmitError.set(null);
            this.stockMovementService
                .create({
                    clinicId,
                    productId,
                    movementType: op === 'in' ? 1 : 2,
                    quantity: amount,
                    unitCost,
                    reason: notesTrimmed || defaultReason,
                    referenceType: null,
                    referenceId: null,
                    occurredAtUtc: new Date().toISOString(),
                    notes: notesTrimmed === '' ? null : notesTrimmed
                })
                .subscribe({
                    next: () => {
                        this.stockOperationSubmitting.set(false);
                        this.closeStockOperationDialog();
                        this.loadStocks(productId);
                    },
                    error: (e: Error) => {
                        this.stockOperationSubmitting.set(false);
                        this.stockOperationSubmitError.set(e.message ?? 'Stok hareketi kaydedilemedi.');
                    }
                });
            return;
        }

        const newMin = raw.minimumStockLevel;
        if (newMin == null || !stock) {
            this.stockOperationForm.markAllAsTouched();
            return;
        }

        this.stockOperationSubmitting.set(true);
        this.stockOperationSubmitError.set(null);
        this.productService.updateProductStockMinimumLevel(stock.id, newMin).subscribe({
            next: () => {
                this.stockOperationSubmitting.set(false);
                this.closeStockOperationDialog();
                this.loadStocks(productId);
            },
            error: (e: Error) => {
                this.stockOperationSubmitting.set(false);
                this.stockOperationSubmitError.set(e.message ?? 'Minimum stok güncellenemedi.');
            }
        });
    }

    onDeactivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p?.isActive || this.ro.mutationBlocked() || !this.canDeactivateProduct) {
            return;
        }
        this.confirmationService.confirm({
            header: 'Ürünü pasifleştir',
            message: 'Bu ürünü pasifleştirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
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
        });
    }

    onActivateClick(): void {
        const id = this.lastId;
        const p = this.product();
        if (!id || !p || p.isActive || this.ro.mutationBlocked() || !this.canUpdateProduct) {
            return;
        }
        this.confirmationService.confirm({
            header: 'Ürünü aktifleştir',
            message: 'Bu ürünü tekrar aktif hale getirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Aktifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
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
        });
    }
}

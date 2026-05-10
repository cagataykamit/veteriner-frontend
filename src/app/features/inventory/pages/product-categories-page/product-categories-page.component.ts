import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import {
    mapProductCategoryDtoToFormValue,
    mapProductCategoryFormToCreateRequest,
    mapProductCategoryFormToUpdateRequest
} from '@/app/features/inventory/data/product-category.mapper';
import {
    createProductCategoryFormGroup,
    getProductCategoryFormValue,
    type ProductCategoryFormControls
} from '@/app/features/inventory/forms/product-category-form.factory';
import type { ProductCategoryListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PRODUCT_CATEGORIES_CREATE_CLAIM,
    PRODUCT_CATEGORIES_DEACTIVATE_CLAIM,
    PRODUCT_CATEGORIES_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

type CategoriesListState = {
    search: string;
    isActiveFilter: string;
    page: number;
    pageSize: number;
};

const PRODUCT_CATEGORIES_LIST_STATE_KEY = 'panel:inventory:product-categories:listState';

@Component({
    selector: 'app-product-categories-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        Paginator,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        MessageModule,
        InputTextModule,
        SelectModule,
        TextareaModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header title="Ürün kategorileri" subtitle="Ürün ve Stok" description="Kategori oluşturun veya düzenleyin.">
            @if (canCreateCategories && !ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni kategori"
                    icon="pi pi-plus"
                    class="p-button-primary"
                    (click)="openCreateDialog()"
                ></button>
            } @else if (canCreateCategories && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni kategori (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">
                Abonelik durumu nedeniyle kategori yönetimi salt okunur.
            </p>
        }

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Kategoriler yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    @if (listActionError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ listActionError() }}</p>
                    }
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Kategoriler</h5>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                                <div
                                    class="flex-1 min-w-0 rounded-lg border p-2 transition-colors"
                                    [ngClass]="
                                        isSearchActive()
                                            ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                            : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                    "
                                >
                                    <label
                                        for="catSearch"
                                        class="flex items-center gap-2 text-xs font-medium mb-1"
                                        [ngClass]="isSearchActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                    >
                                        Arama
                                    </label>
                                    <input
                                        pInputText
                                        id="catSearch"
                                        class="w-full"
                                        [(ngModel)]="searchInput"
                                        placeholder="Kategori adı…"
                                        (keyup.enter)="applyFilters()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                    <p-button
                                        [label]="copy.buttonClear"
                                        icon="pi pi-times"
                                        severity="secondary"
                                        (onClick)="resetFilters()"
                                        [disabled]="loading()"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div
                                class="col-span-12 md:col-span-6 lg:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isActiveFilterApplied()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span
                                    id="lblCatActive"
                                    class="flex items-center gap-2 text-xs font-medium mb-1 text-muted-color"
                                    >Durum filtresi</span
                                >
                                <p-select
                                    ariaLabelledBy="lblCatActive"
                                    inputId="catActiveFilter"
                                    [options]="activeFilterOptions"
                                    [(ngModel)]="isActiveFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tüm durumlar"
                                    styleClass="w-full"
                                    [showClear]="true"
                                />
                            </div>
                        </div>
                    </div>

                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="emptyListMessage()" [hint]="emptyListHint()" />
                    } @else {
                        <div class="hidden lg:block overflow-x-auto">
                            <p-table
                                [value]="displayedRows()"
                                [paginator]="true"
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '48rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Kategori adı</th>
                                        <th>Açıklama</th>
                                        <th>Durum</th>
                                        <th style="min-width: 14rem">İşlem</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium">{{ row.name }}</td>
                                        <td class="max-w-md">
                                            <span class="line-clamp-2 break-words" [title]="row.descriptionText">{{ row.descriptionText }}</span>
                                        </td>
                                        <td>
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </td>
                                        <td>
                                            <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                @if (canUpdateCategories && !ro.mutationBlocked()) {
                                                    <button
                                                        type="button"
                                                        class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                        [disabled]="rowMutatingId() !== null"
                                                        (click)="openEditDialog(row)"
                                                    >
                                                        Düzenle
                                                    </button>
                                                }
                                                @if (canDeactivateCategories && !ro.mutationBlocked() && row.isActive) {
                                                    <button
                                                        type="button"
                                                        class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                                                        [disabled]="rowMutatingId() !== null"
                                                        (click)="onDeactivate(row)"
                                                    >
                                                        Pasifleştir
                                                    </button>
                                                }
                                                @if (canUpdateCategories && !ro.mutationBlocked() && !row.isActive) {
                                                    <button
                                                        type="button"
                                                        class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                        [disabled]="rowMutatingId() !== null"
                                                        (click)="onActivate(row)"
                                                    >
                                                        Aktifleştir
                                                    </button>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="lg:hidden space-y-3">
                            @for (row of displayedRows(); track row.id) {
                                <div
                                    class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                                >
                                    <div class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-2">{{ row.name }}</div>
                                    <div class="text-sm text-muted-color mb-2 break-words">{{ row.descriptionText }}</div>
                                    <div class="mb-3">
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </div>
                                    <div class="flex flex-wrap justify-end gap-x-3 gap-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                        @if (canUpdateCategories && !ro.mutationBlocked()) {
                                            <button
                                                type="button"
                                                class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                [disabled]="rowMutatingId() !== null"
                                                (click)="openEditDialog(row)"
                                            >
                                                Düzenle
                                            </button>
                                        }
                                        @if (canDeactivateCategories && !ro.mutationBlocked() && row.isActive) {
                                            <button
                                                type="button"
                                                class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                                                [disabled]="rowMutatingId() !== null"
                                                (click)="onDeactivate(row)"
                                            >
                                                Pasifleştir
                                            </button>
                                        }
                                        @if (canUpdateCategories && !ro.mutationBlocked() && !row.isActive) {
                                            <button
                                                type="button"
                                                class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                [disabled]="rowMutatingId() !== null"
                                                (click)="onActivate(row)"
                                            >
                                                Aktifleştir
                                            </button>
                                        }
                                    </div>
                                </div>
                            }
                        </div>

                        <div class="lg:hidden mt-4">
                            <p-paginator
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [first]="first()"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                                [rowsPerPageOptions]="[10, 25, 50]"
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                </div>
            }
        </div>

        <p-dialog
            [header]="dialogHeader()"
            [modal]="true"
            [visible]="dialogVisible()"
            (visibleChange)="onDialogVisibleChange($event)"
            [style]="{ width: 'min(32rem, 95vw)' }"
            [draggable]="false"
        >
            <form [formGroup]="dialogForm" (ngSubmit)="submitDialog()" class="flex flex-col gap-4">
                @if (dialogError()) {
                    <p-message severity="error" styleClass="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="catName" class="block text-sm font-medium text-muted-color">Kategori adı *</label>
                    <input id="catName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" />
                    @if (dialogForm.controls.name.invalid && dialogForm.controls.name.touched) {
                        @if (dialogForm.controls.name.hasError('required')) {
                            <small class="text-red-500">Kategori adı zorunludur.</small>
                        } @else if (dialogForm.controls.name.hasError('maxlength')) {
                            <small class="text-red-500">Kategori adı en fazla 200 karakter olabilir.</small>
                        }
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="catDesc" class="block text-sm font-medium text-muted-color">Açıklama</label>
                    <textarea id="catDesc" pTextarea rows="3" class="w-full" formControlName="description"></textarea>
                    @if (dialogForm.controls.description.invalid && dialogForm.controls.description.touched) {
                        <small class="text-red-500">Açıklama en fazla 2000 karakter olabilir.</small>
                    }
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <p-button type="button" [label]="copy.buttonCancel" severity="secondary" (onClick)="closeDialog()" [disabled]="dialogSubmitting()" />
                    <p-button
                        type="submit"
                        [label]="dialogSubmitLabel()"
                        icon="pi pi-check"
                        [loading]="dialogSubmitting()"
                        [disabled]="dialogForm.invalid || dialogSubmitting() || ro.mutationBlocked()"
                    />
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ProductCategoriesPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_CREATE_CLAIM);
    readonly canUpdateCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_UPDATE_CLAIM);
    readonly canDeactivateCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_DEACTIVATE_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly rowMutatingId = signal<string | null>(null);

    readonly rawItems = signal<ProductCategoryListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeIsActiveFilter = signal('');

    searchInput = '';
    isActiveFilter = '';

    readonly displayedRows = () => this.rawItems();

    readonly activeFilterOptions = [
        { label: 'Aktif', value: 'true' },
        { label: 'Pasif', value: 'false' }
    ];

    readonly dialogVisible = signal(false);
    readonly dialogMode = signal<'create' | 'edit'>('create');
    readonly editingId = signal<string | null>(null);
    readonly dialogSubmitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly dialogForm: ProductCategoryFormControls = createProductCategoryFormGroup(this.fb);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeIsActiveFilter());
    }

    emptyListMessage(): string {
        if (this.totalItems() > 0) {
            return '';
        }
        if (this.isSearchActive() || this.isActiveFilterApplied()) {
            return this.copy.listEmptyMessage;
        }
        return 'Henüz ürün kategorisi yok.';
    }

    emptyListHint(): string {
        if (this.totalItems() > 0) {
            return '';
        }
        if (this.isSearchActive() || this.isActiveFilterApplied()) {
            return this.copy.listEmptyHint;
        }
        return '';
    }

    dialogHeader(): string {
        return this.dialogMode() === 'create' ? 'Yeni kategori' : 'Kategori düzenle';
    }

    dialogSubmitLabel(): string {
        return this.dialogMode() === 'create' ? this.copy.buttonSave : 'Güncelle';
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeIsActiveFilter.set(String(this.isActiveFilter ?? '').trim());
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeIsActiveFilter());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.isActiveFilter = '';
        this.activeSearch.set('');
        this.activeIsActiveFilter.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeIsActiveFilter(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeIsActiveFilter());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeIsActiveFilter());
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isActiveFilterApplied(): boolean {
        return this.activeIsActiveFilter() === 'true' || this.activeIsActiveFilter() === 'false';
    }

    openCreateDialog(): void {
        if (!this.canCreateCategories || this.ro.mutationBlocked()) {
            return;
        }
        this.dialogMode.set('create');
        this.editingId.set(null);
        this.dialogError.set(null);
        this.dialogForm.reset({ name: '', description: '' }, { emitEvent: false });
        this.dialogForm.markAsUntouched();
        this.dialogVisible.set(true);
    }

    openEditDialog(row: ProductCategoryListItemVm): void {
        if (!this.canUpdateCategories || this.ro.mutationBlocked()) {
            return;
        }
        this.dialogMode.set('edit');
        this.editingId.set(row.id);
        this.dialogError.set(null);
        this.dialogSubmitting.set(true);
        this.dialogVisible.set(true);
        this.categoryService.getDtoById(row.id).subscribe({
            next: (dto) => {
                const v = mapProductCategoryDtoToFormValue(dto);
                this.dialogForm.reset(v, { emitEvent: false });
                this.dialogForm.markAsUntouched();
                this.dialogSubmitting.set(false);
            },
            error: (e: Error) => {
                this.dialogSubmitting.set(false);
                this.dialogError.set(e.message ?? 'Kategori yüklenemedi.');
            }
        });
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
    }

    onDialogVisibleChange(visible: boolean): void {
        this.dialogVisible.set(visible);
        if (!visible) {
            this.resetDialogFormState();
        }
    }

    private resetDialogFormState(): void {
        this.editingId.set(null);
        this.dialogError.set(null);
        this.dialogSubmitting.set(false);
        this.dialogForm.reset({ name: '', description: '' }, { emitEvent: false });
        this.dialogForm.markAsUntouched();
    }

    submitDialog(): void {
        if (this.dialogForm.invalid || this.dialogSubmitting() || this.ro.mutationBlocked()) {
            this.dialogForm.markAllAsTouched();
            return;
        }
        const value = getProductCategoryFormValue(this.dialogForm);
        this.dialogSubmitting.set(true);
        this.dialogError.set(null);
        if (this.dialogMode() === 'create') {
            const body = mapProductCategoryFormToCreateRequest(value);
            this.categoryService.create(body).subscribe({
                next: () => {
                    this.dialogSubmitting.set(false);
                    this.resetDialogFormState();
                    this.dialogVisible.set(false);
                    this.reload();
                },
                error: (e: Error) => {
                    this.dialogSubmitting.set(false);
                    this.dialogError.set(e.message ?? 'Kayıt başarısız.');
                }
            });
            return;
        }
        const id = this.editingId();
        if (!id) {
            this.dialogSubmitting.set(false);
            return;
        }
        const body = mapProductCategoryFormToUpdateRequest(value);
        this.categoryService.update(id, body).subscribe({
            next: () => {
                this.dialogSubmitting.set(false);
                this.resetDialogFormState();
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: Error) => {
                this.dialogSubmitting.set(false);
                this.dialogError.set(e.message ?? 'Güncelleme başarısız.');
            }
        });
    }

    onDeactivate(row: ProductCategoryListItemVm): void {
        if (!this.canDeactivateCategories || this.ro.mutationBlocked() || !row.isActive) {
            return;
        }
        const id = row.id;
        this.confirmationService.confirm({
            header: 'Kategoriyi pasifleştir',
            message: 'Bu kategoriyi pasifleştirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.rowMutatingId.set(id);
                this.listActionError.set(null);
                this.categoryService.deactivate(id).subscribe({
                    next: () => {
                        this.rowMutatingId.set(null);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.rowMutatingId.set(null);
                        this.listActionError.set(e.message ?? 'Pasifleştirme başarısız.');
                    }
                });
            }
        });
    }

    onActivate(row: ProductCategoryListItemVm): void {
        if (!this.canUpdateCategories || this.ro.mutationBlocked() || row.isActive) {
            return;
        }
        const id = row.id;
        this.confirmationService.confirm({
            header: 'Kategoriyi aktifleştir',
            message: 'Bu kategoriyi tekrar aktif hale getirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Aktifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.rowMutatingId.set(id);
                this.listActionError.set(null);
                this.categoryService.activate(id).subscribe({
                    next: () => {
                        this.rowMutatingId.set(null);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.rowMutatingId.set(null);
                        this.listActionError.set(e.message ?? 'Aktifleştirme başarısız.');
                    }
                });
            }
        });
    }

    private parseIsActive(filter: string): boolean | undefined {
        if (filter === 'true') {
            return true;
        }
        if (filter === 'false') {
            return false;
        }
        return undefined;
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        isActiveFilterStr: string,
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${isActiveFilterStr}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.categoryService
            .list({
                page,
                pageSize,
                search: search.trim() || undefined,
                isActive: this.parseIsActive(isActiveFilterStr)
            })
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PRODUCT_CATEGORIES_LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<CategoriesListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.isActiveFilter = typeof parsed.isActiveFilter === 'string' ? parsed.isActiveFilter : '';
            this.activeSearch.set(this.searchInput.trim());
            this.activeIsActiveFilter.set(String(this.isActiveFilter ?? '').trim());
            this.currentPage.set(page);
            this.pageSize.set(pageSize);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: CategoriesListState = {
            search: this.searchInput,
            isActiveFilter: this.isActiveFilter,
            page,
            pageSize
        };
        sessionStorage.setItem(PRODUCT_CATEGORIES_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PRODUCT_CATEGORIES_LIST_STATE_KEY);
    }
}

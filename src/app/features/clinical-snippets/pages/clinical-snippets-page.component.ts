import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_SNIPPETS_CREATE_CLAIM, CLINICAL_SNIPPETS_DEACTIVATE_CLAIM, CLINICAL_SNIPPETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import {
    CLINICAL_SNIPPET_BODY_MAX,
    CLINICAL_SNIPPET_SHORTCUT_MAX,
    CLINICAL_SNIPPET_TITLE_MAX,
    type ClinicalSnippetDto
} from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { ClinicalSnippetError, ClinicalSnippetsService } from '@/app/entities/clinical-snippet/services/clinical-snippets.service';
import { isValidSnippetShortcut, normalizeSnippetShortcut } from '@/app/entities/clinical-snippet/utils/clinical-snippet-text.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const PAGE_SIZE = 50;

/** Boş alan `required` denetimine kalır; dolu kısayol sunucunun normalleştirmesinden sonra biçime uymalı (sözleşme §1). */
function shortcutFormat(c: AbstractControl): ValidationErrors | null {
    const raw = typeof c.value === 'string' ? c.value.trim() : '';

    return !raw || isValidSnippetShortcut(normalizeSnippetShortcut(raw)) ? null : { shortcutFormat: true };
}

/**
 * Klinik metin parçaları yönetimi (EXAM-011/012), Tanımlar altında. Varsayılan liste aktif parçalardır; "Pasifleri göster"
 * pasifleri de getirir. Ekle / düzenle / pasifleştir-etkinleştir düğmeleri izne ve salt okunur kiracı durumuna göre görünür.
 */
@Component({
    selector: 'app-clinical-snippets-page',
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        CheckboxModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        SearchInputComponent
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Metin parçaları"
            description="Muayene metin alanlarında # ile eklenen hazır cümle ve soru setleri. Liste kliniğinize özeldir."
        >
            @if (canCreate && !ro.mutationBlocked()) {
                <button actions pButton type="button" data-testid="snippet-new" (click)="openCreate()"><i class="pi pi-plus"></i>Yeni parça</button>
            }
        </app-page-header>

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle metin parçası yönetimi salt okunur.</p>
        }

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div class="w-full md:max-w-sm">
                    <app-search-input inputId="snippetSearch" placeholder="Kısayol veya başlık…" ariaLabel="Metin parçası ara" [(value)]="searchInput" (searchRequested)="applySearch()" />
                </div>
                <label class="flex items-center gap-2">
                    <p-checkbox inputId="snippetIncludeInactive" [binary]="true" [ngModel]="includeInactive()" (ngModelChange)="onIncludeInactiveChange($event)" />
                    <span class="text-sm">Pasifleri göster</span>
                </label>
            </div>

            @if (listActionError()) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
            }

            @if (loading() && rows().length === 0) {
                <app-loading-state message="Metin parçaları yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (rows().length === 0) {
                <app-empty-state
                    [message]="activeSearch() ? copy.listEmptyMessage : 'Henüz metin parçası yok.'"
                    [hint]="activeSearch() ? copy.listEmptyHint : 'Sık yazdığınız soru setlerini ve cümleleri kısayolla kaydedin; muayenede # yazınca listelenir.'"
                />
            } @else {
                <div class="overflow-x-auto table-stack-phone">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="totalItems() > pageSize"
                        [rows]="pageSize"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '44rem' }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Kısayol</th>
                                <th>Başlık</th>
                                <th>Metin</th>
                                <th>Durum</th>
                                <th style="min-width: 11rem">İşlem</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr data-testid="snippet-row">
                                <td class="font-medium whitespace-nowrap" [class.text-muted-color]="!row.isActive">#{{ row.shortcut }}</td>
                                <td data-label="Başlık" [class.text-muted-color]="!row.isActive">{{ row.title }}</td>
                                <td data-label="Metin">
                                    <div class="truncate max-w-[24rem] max-sm:max-w-none max-sm:whitespace-normal max-sm:break-words text-sm text-muted-color" [title]="row.body">{{ row.body }}</div>
                                </td>
                                <td data-label="Durum">
                                    <app-status-tag [label]="row.isActive ? 'Aktif' : 'Pasif'" [severity]="row.isActive ? 'success' : 'warn'" />
                                </td>
                                <td>
                                    @if (!ro.mutationBlocked()) {
                                        <div class="flex flex-wrap gap-x-3 gap-y-1 items-center max-sm:pt-2 max-sm:gap-x-5">
                                            @if (canUpdate) {
                                                <button type="button" class="max-sm:touch-hit p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="openEdit(row)">
                                                    Düzenle
                                                </button>
                                            }
                                            @if (canDeactivate && row.isActive) {
                                                <button
                                                    type="button"
                                                    class="max-sm:touch-hit p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                                                    [disabled]="mutatingId() !== null"
                                                    (click)="confirmDeactivate(row)"
                                                >
                                                    Pasifleştir
                                                </button>
                                            }
                                            @if (canDeactivate && !row.isActive) {
                                                <button type="button" class="max-sm:touch-hit p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="setActive(row, true)">
                                                    Etkinleştir
                                                </button>
                                            }
                                        </div>
                                    }
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <p-dialog
            [header]="editing() ? 'Metin parçasını düzenle' : 'Yeni metin parçası'"
            [modal]="true"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [style]="{ width: 'min(40rem, 95vw)' }"
            [draggable]="false"
        >
            <form [formGroup]="dialogForm" (ngSubmit)="submitDialog()" class="flex flex-col gap-4">
                <p class="m-0 text-sm text-muted-color">
                    Muayene metin alanında # yazıp kısayolu seçince metin imlecin olduğu yere eklenir. Muayene şablonundan farkı: kayıt ya da ücret üretmez, yalnız metin ekler.
                </p>
                @if (dialogError()) {
                    <p-message severity="error" class="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="snippetShortcut" class="block text-sm font-medium text-muted-color">Kısayol *</label>
                    <input id="snippetShortcut" pInputText class="w-full" type="text" formControlName="shortcut" autocomplete="off" placeholder="#kusma" [maxlength]="shortcutMax + 1" />
                    @if (dialogForm.controls.shortcut.touched && dialogForm.controls.shortcut.hasError('required')) {
                        <small class="text-red-500">Kısayol zorunludur.</small>
                    } @else if (dialogForm.controls.shortcut.touched && dialogForm.controls.shortcut.hasError('shortcutFormat')) {
                        <small class="text-red-500">2–30 karakter; yalnız harf, rakam ve tire (boşluk yok).</small>
                    } @else {
                        <small class="text-muted-color">Türkçe harfler sadeleşir: #İshal → #ishal.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="snippetTitle" class="block text-sm font-medium text-muted-color">Başlık *</label>
                    <input id="snippetTitle" pInputText class="w-full" type="text" formControlName="title" autocomplete="off" placeholder="Kusma anamnezi" [maxlength]="titleMax" />
                    @if (dialogForm.controls.title.invalid && dialogForm.controls.title.touched) {
                        <small class="text-red-500">Başlık zorunludur.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="snippetBody" class="block text-sm font-medium text-muted-color">Metin *</label>
                    <textarea id="snippetBody" rows="8" class="w-full p-inputtext p-component" formControlName="body" [attr.maxlength]="bodyMax"></textarea>
                    @if (dialogForm.controls.body.invalid && dialogForm.controls.body.touched) {
                        <small class="text-red-500">Metin zorunludur.</small>
                    } @else {
                        <small class="text-muted-color">Satır sonları korunur. {{ dialogForm.controls.body.value.length }} / {{ bodyMax }}</small>
                    }
                    @if (editing()) {
                        <small class="text-muted-color">Önceden eklenmiş muayene metinleri değişmez.</small>
                    }
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="dialogForm.invalid || submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ClinicalSnippetsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly shortcutMax = CLINICAL_SNIPPET_SHORTCUT_MAX;
    readonly titleMax = CLINICAL_SNIPPET_TITLE_MAX;
    readonly bodyMax = CLINICAL_SNIPPET_BODY_MAX;
    readonly pageSize = PAGE_SIZE;

    private readonly snippets = inject(ClinicalSnippetsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreate = this.auth.hasOperationClaim(CLINICAL_SNIPPETS_CREATE_CLAIM);
    readonly canUpdate = this.auth.hasOperationClaim(CLINICAL_SNIPPETS_UPDATE_CLAIM);
    readonly canDeactivate = this.auth.hasOperationClaim(CLINICAL_SNIPPETS_DEACTIVATE_CLAIM);

    readonly activeSearch = signal('');
    readonly includeInactive = signal(false);
    searchInput = '';

    readonly rows = signal<ClinicalSnippetDto[]>([]);
    readonly totalItems = signal(0);
    readonly first = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutatingId = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly editing = signal<ClinicalSnippetDto | null>(null);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly dialogForm = this.fb.nonNullable.group({
        shortcut: ['', [Validators.required, Validators.pattern(/\S/), shortcutFormat]],
        title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CLINICAL_SNIPPET_TITLE_MAX)]],
        body: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CLINICAL_SNIPPET_BODY_MAX)]]
    });

    ngOnInit(): void {
        this.load(1);
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.load(1);
    }

    onIncludeInactiveChange(value: boolean): void {
        this.includeInactive.set(value);
        this.load(1);
    }

    reload(): void {
        this.load(this.first() / PAGE_SIZE + 1);
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const page = Math.floor((event.first ?? 0) / PAGE_SIZE) + 1;

        if (page !== this.first() / PAGE_SIZE + 1) {
            this.load(page);
        }
    }

    openCreate(): void {
        this.openDialog(null);
    }

    openEdit(row: ClinicalSnippetDto): void {
        this.openDialog(row);
    }

    submitDialog(): void {
        if (this.dialogForm.invalid || this.submitting()) {
            this.dialogForm.markAllAsTouched();

            return;
        }

        const v = this.dialogForm.getRawValue();
        const request = { shortcut: v.shortcut.trim(), title: v.title.trim(), body: v.body };
        const row = this.editing();

        this.submitting.set(true);
        this.dialogError.set(null);
        const call = row ? this.snippets.update(row.id, request, row.rowVersion) : this.snippets.create(request);

        call.subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof ClinicalSnippetError && e.isConflict) {
                    // Eski sürümle tekrar denenmesin: pencere kapanır, liste yenilenir, kullanıcı güncel kayıtla yeniden açar.
                    this.dialogVisible.set(false);
                    this.listActionError.set(e.message);
                    this.reload();

                    return;
                }

                this.dialogError.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }

    confirmDeactivate(row: ClinicalSnippetDto): void {
        this.confirmation.confirm({
            header: 'Metin parçasını pasifleştir',
            message: `#${row.shortcut} muayenede # listesinde görünmez. Önceden eklenmiş metinler değişmez; parçayı sonra yeniden etkinleştirebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setActive(row, false)
        });
    }

    setActive(row: ClinicalSnippetDto, active: boolean): void {
        if (!this.canDeactivate || this.ro.mutationBlocked() || this.mutatingId() !== null) {
            return;
        }

        this.mutatingId.set(row.id);
        this.listActionError.set(null);
        this.snippets.setActive(row.id, active).subscribe({
            next: () => {
                this.mutatingId.set(null);
                this.reload();
            },
            error: (e: unknown) => {
                this.mutatingId.set(null);
                this.listActionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');
            }
        });
    }

    private openDialog(row: ClinicalSnippetDto | null): void {
        const allowed = row ? this.canUpdate : this.canCreate;

        if (!allowed || this.ro.mutationBlocked()) {
            return;
        }

        this.editing.set(row);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.dialogForm.reset({ shortcut: row ? `#${row.shortcut}` : '', title: row?.title ?? '', body: row?.body ?? '' });
        this.dialogVisible.set(true);
    }

    private load(page: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.snippets.list({ search: this.activeSearch(), includeInactive: this.includeInactive(), page, pageSize: PAGE_SIZE }).subscribe({
            next: (r) => {
                this.rows.set(r.items);
                this.totalItems.set(r.totalItems);
                this.first.set((r.page - 1) * PAGE_SIZE);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Metin parçaları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}

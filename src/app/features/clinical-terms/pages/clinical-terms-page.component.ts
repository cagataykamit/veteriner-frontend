import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLINICAL_TERMS_CREATE_CLAIM,
    CLINICAL_TERMS_DEACTIVATE_CLAIM,
    CLINICAL_TERMS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import {
    CLINICAL_TERM_KIND_LABELS,
    CLINICAL_TERM_NAME_MAX,
    type ClinicalTermDto,
    type ClinicalTermKind
} from '@/app/features/clinical-terms/models/clinical-term.model';
import { ClinicalTermError, ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const PAGE_SIZE = 50;

/**
 * Tanı/şikâyet sözlüğü yönetimi (ADR-020 S3), Tanımlar altında. Pasifler dahil listelenir; sistem terimleri salt okunurdur
 * ve rozetle ayrışır. Ekle / ad düzelt / pasifleştir-etkinleştir düğmeleri izne ve salt okunur kiracı durumuna göre görünür.
 */
@Component({
    selector: 'app-clinical-terms-page',
    standalone: true,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        SelectButtonModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        SearchInputComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Tanı ve şikâyet sözlüğü"
            description="Muayenede şikâyet ve tanı alanlarında aranan liste. Sistem terimleri ortaktır; kliniğinize özel terim ekleyebilirsiniz."
        >
            @if (canCreate && !ro.mutationBlocked()) {
                <button actions pButton type="button" label="Yeni terim" icon="pi pi-plus" data-testid="term-new" (click)="openCreate()"></button>
            }
        </app-page-header>

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle sözlük yönetimi salt okunur.</p>
        }

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                <p-selectbutton
                    [options]="kindOptions"
                    [ngModel]="kind()"
                    (ngModelChange)="onKindChange($event)"
                    optionLabel="label"
                    optionValue="value"
                    [allowEmpty]="false"
                    ariaLabel="Sözlük türü"
                />
                <div class="w-full md:max-w-sm">
                    <app-search-input inputId="termSearch" placeholder="Terim adı…" ariaLabel="Terim ara" [(value)]="searchInput" (search)="applySearch()" />
                </div>
            </div>

            @if (listActionError()) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
            }

            @if (loading() && rows().length === 0) {
                <app-loading-state message="Sözlük yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (rows().length === 0) {
                <app-empty-state [message]="activeSearch() ? copy.listEmptyMessage : 'Bu türde terim yok.'" [hint]="activeSearch() ? copy.listEmptyHint : ''" />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="totalItems() > pageSize"
                        [rows]="pageSize"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '36rem' }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th>Kaynak</th>
                                <th>Durum</th>
                                <th style="min-width: 12rem">İşlem</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr data-testid="term-row">
                                <td class="font-medium" [class.text-muted-color]="!row.isActive">{{ row.name }}</td>
                                <td>
                                    <app-status-tag [label]="row.isSystem ? 'Sistem' : 'Kliniğe özel'" [severity]="row.isSystem ? 'secondary' : 'info'" />
                                </td>
                                <td>
                                    <app-status-tag [label]="row.isActive ? 'Aktif' : 'Pasif'" [severity]="row.isActive ? 'success' : 'warn'" />
                                </td>
                                <td>
                                    @if (row.isSystem) {
                                        <span class="text-sm text-muted-color">Salt okunur</span>
                                    } @else if (!ro.mutationBlocked()) {
                                        <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                            @if (canUpdate) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="openRename(row)">
                                                    Adı düzelt
                                                </button>
                                            }
                                            @if (canDeactivate && row.isActive) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="confirmDeactivate(row)">
                                                    Pasifleştir
                                                </button>
                                            }
                                            @if (canDeactivate && !row.isActive) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="mutatingId() !== null" (click)="setActive(row, true)">
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
            [header]="editing() ? 'Terim adını düzelt' : 'Yeni ' + kindLabel().toLocaleLowerCase('tr') + ' terimi'"
            [modal]="true"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [style]="{ width: 'min(28rem, 95vw)' }"
            [draggable]="false"
        >
            <form [formGroup]="dialogForm" (ngSubmit)="submitDialog()" class="flex flex-col gap-4">
                @if (dialogError()) {
                    <p-message severity="error" styleClass="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="termName" class="block text-sm font-medium text-muted-color">Ad *</label>
                    <input id="termName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" [maxlength]="nameMax" />
                    @if (dialogForm.controls.name.invalid && dialogForm.controls.name.touched) {
                        <small class="text-red-500">Ad zorunludur.</small>
                    }
                    @if (editing()) {
                        <small class="text-muted-color">Geçmiş muayene metinleri değişmez.</small>
                    }
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <p-button type="button" [label]="copy.buttonCancel" severity="secondary" (onClick)="dialogVisible.set(false)" [disabled]="submitting()" />
                    <p-button type="submit" [label]="copy.buttonSave" icon="pi pi-check" [loading]="submitting()" [disabled]="dialogForm.invalid || submitting()" />
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ClinicalTermsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly nameMax = CLINICAL_TERM_NAME_MAX;
    readonly pageSize = PAGE_SIZE;

    private readonly terms = inject(ClinicalTermsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreate = this.auth.hasOperationClaim(CLINICAL_TERMS_CREATE_CLAIM);
    readonly canUpdate = this.auth.hasOperationClaim(CLINICAL_TERMS_UPDATE_CLAIM);
    readonly canDeactivate = this.auth.hasOperationClaim(CLINICAL_TERMS_DEACTIVATE_CLAIM);

    readonly kindOptions = (['Diagnosis', 'Complaint'] as const).map((value) => ({ value, label: CLINICAL_TERM_KIND_LABELS[value] }));

    readonly kind = signal<ClinicalTermKind>('Diagnosis');
    readonly activeSearch = signal('');
    searchInput = '';

    readonly rows = signal<ClinicalTermDto[]>([]);
    readonly totalItems = signal(0);
    readonly first = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutatingId = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly editing = signal<ClinicalTermDto | null>(null);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly dialogForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CLINICAL_TERM_NAME_MAX)]]
    });

    ngOnInit(): void {
        this.load(1);
    }

    kindLabel(): string {
        return CLINICAL_TERM_KIND_LABELS[this.kind()];
    }

    onKindChange(kind: ClinicalTermKind): void {
        this.kind.set(kind);
        this.load(1);
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
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

    openRename(row: ClinicalTermDto): void {
        this.openDialog(row);
    }

    submitDialog(): void {
        if (this.dialogForm.invalid || this.submitting()) {
            this.dialogForm.markAllAsTouched();
            return;
        }
        const name = this.dialogForm.getRawValue().name;
        const row = this.editing();
        this.submitting.set(true);
        this.dialogError.set(null);
        const request = row ? this.terms.rename(row.id, name, row.rowVersion) : this.terms.create(this.kind(), name);
        request.subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof ClinicalTermError && e.isConflict) {
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

    confirmDeactivate(row: ClinicalTermDto): void {
        this.confirmation.confirm({
            header: 'Terimi pasifleştir',
            message: `"${row.name}" muayene aramasında görünmez. Geçmiş muayene metinleri değişmez; terimi sonra yeniden etkinleştirebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setActive(row, false)
        });
    }

    setActive(row: ClinicalTermDto, active: boolean): void {
        if (!this.canDeactivate || row.isSystem || this.ro.mutationBlocked() || this.mutatingId() !== null) {
            return;
        }
        this.mutatingId.set(row.id);
        this.listActionError.set(null);
        this.terms.setActive(row.id, active).subscribe({
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

    private openDialog(row: ClinicalTermDto | null): void {
        const allowed = row ? this.canUpdate && !row.isSystem : this.canCreate;
        if (!allowed || this.ro.mutationBlocked()) {
            return;
        }
        this.editing.set(row);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.dialogForm.reset({ name: row?.name ?? '' });
        this.dialogVisible.set(true);
    }

    private load(page: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.terms
            .list({ kind: this.kind(), search: this.activeSearch(), includeInactive: true, page, pageSize: PAGE_SIZE })
            .subscribe({
                next: (r) => {
                    this.rows.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.first.set((r.page - 1) * PAGE_SIZE);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    this.error.set(e instanceof Error ? e.message : 'Sözlük yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }
}

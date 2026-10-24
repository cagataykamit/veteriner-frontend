import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CANCEL_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ImagingCancelDialogComponent } from '@/app/features/imaging/components/imaging-cancel-dialog.component';
import type { ImagingModality, ImagingRecordListItemVm, ImagingRecordStatus } from '@/app/features/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { IMAGING_ADDED_AFTER_FINALIZATION_LABEL, IMAGING_MODALITY_OPTIONS, IMAGING_STATUS_FILTER_OPTIONS, imagingModalityLabel } from '@/app/features/imaging/utils/imaging.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Görüntüleme listesi (Kayıtlar > Görüntüleme; ADR-023): süzgeç hasta (arama ve hasta kartından bağlam), tür, tarih, durum.
 * Satır eylemleri ADR-026: Detay ve (yetki + etkin kayıtta) İptal; düzenleme sayfası olmadığı için Düzenle yok.
 * "Yeni" yalnız bağlamdan açılır (ADR-017 K4): hasta kartı eylem çubuğu ve muayene çalışma alanı.
 */
@Component({
    selector: 'app-imaging-list-page',
    standalone: true,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        Paginator,
        SelectModule,
        DateInputComponent,
        SearchInputComponent,
        AppListHeaderComponent,
        AppContextFilterChipComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppRowActionButtonComponent,
        AppStatusTagComponent,
        ImagingCancelDialogComponent,
        TrDateTimePipe
    ],
    template: `
        @if (contextPetId()) {
            <app-context-filter-chip label="Seçili hastanın kayıtları gösteriliyor" (clear)="clearContextFilter()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                    <app-list-header class="mb-3" title="Görüntüleme" [count]="totalItems()">
                        <div class="flex-1 min-w-0">
                            <label for="imgSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                            <app-search-input inputId="imgSearch" placeholder="Hasta, müşteri veya açıklama…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </div>
                        <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    </app-list-header>
                    <div class="grid grid-cols-12 gap-3 items-end">
                        <div class="col-span-12 md:col-span-3">
                            <label for="imgModalityFilter" class="block text-xs font-medium text-muted-color mb-1">Tür</label>
                            <p-select
                                inputId="imgModalityFilter"
                                [options]="modalityOptions"
                                optionLabel="label"
                                optionValue="value"
                                [(ngModel)]="modalityInput"
                                (ngModelChange)="applyFilters()"
                                [showClear]="true"
                                placeholder="Tüm türler"
                                styleClass="w-full"
                            />
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <label for="imgFrom" class="block text-xs font-medium text-muted-color mb-1">Tarih (başlangıç)</label>
                            <app-date-input inputId="imgFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <label for="imgTo" class="block text-xs font-medium text-muted-color mb-1">Tarih (bitiş)</label>
                            <app-date-input inputId="imgTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <label for="imgStatus" class="block text-xs font-medium text-muted-color mb-1">Durum</label>
                            <p-select inputId="imgStatus" [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="statusInput" (ngModelChange)="applyFilters()" styleClass="w-full" />
                        </div>
                    </div>
                </div>

                @if (loading()) {
                    <app-loading-state message="Liste yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (rows().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
                    <ul class="list-none m-0 p-0 flex flex-col" data-testid="imaging-rows">
                        @for (row of rows(); track row.id) {
                            <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0" [class.opacity-60]="row.status === 'Cancelled'">
                                <span class="text-sm w-40 shrink-0">{{ row.performedAtUtc | trDateTime }}</span>
                                <span class="font-medium w-32 shrink-0">{{ modalityLabel(row.modality) }}</span>
                                <span class="min-w-0 flex-1 break-words">
                                    <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                    <span class="text-muted-color text-sm"> · {{ row.clientName }}</span>
                                    @if (row.description) {
                                        <span class="block text-sm text-muted-color">{{ row.description }}</span>
                                    }
                                </span>
                                <span class="text-sm text-muted-color" data-testid="imaging-file-count">{{ row.fileCount }} dosya</span>
                                @if (row.addedAfterExaminationFinalization) {
                                    <app-status-tag [label]="lateLabel" severity="info" />
                                }
                                @if (row.status === 'Cancelled') {
                                    <app-status-tag label="İptal" severity="secondary" />
                                }
                                <span class="flex items-center gap-1">
                                    <app-row-action-button action="detail" [link]="['/panel/imaging', row.id]" />
                                    @if (canCancelRow(row) && !ro.mutationBlocked()) {
                                        <app-row-action-button action="void" (pressed)="openCancel(row)" />
                                    }
                                </span>
                            </li>
                        }
                    </ul>
                    <p-paginator
                        [rows]="pageSize()"
                        [totalRecords]="totalItems()"
                        [first]="(page() - 1) * pageSize()"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        (onPageChange)="onPageChange($event)"
                    />
                }
            </div>
        </div>

        <app-imaging-cancel-dialog [(visible)]="cancelVisible" [target]="cancelTarget()" (cancelled)="reload()" />
    `
})
export class ImagingListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    readonly modalityOptions = IMAGING_MODALITY_OPTIONS;
    readonly statusOptions = IMAGING_STATUS_FILTER_OPTIONS;
    readonly lateLabel = IMAGING_ADDED_AFTER_FINALIZATION_LABEL;
    readonly modalityLabel = imagingModalityLabel;

    private readonly auth = inject(AuthService);
    private readonly imagingService = inject(ImagingRecordsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly canCancel = this.auth.hasOperationClaim(IMAGING_CANCEL_CLAIM);
    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ImagingRecordListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly page = signal(1);
    readonly pageSize = signal(20);

    searchInput = '';
    modalityInput: ImagingModality | null = null;
    fromDateInput = '';
    toDateInput = '';
    statusInput: ImagingRecordStatus | '' = '';

    readonly cancelTarget = signal<ImagingRecordListItemVm | null>(null);
    cancelVisible = false;

    ngOnInit(): void {
        this.reload();
    }

    canCancelRow(row: ImagingRecordListItemVm): boolean {
        return this.canCancel && row.status === 'Active';
    }

    openCancel(row: ImagingRecordListItemVm): void {
        this.cancelTarget.set(row);
        this.cancelVisible = true;
    }

    applyFilters(): void {
        if (this.fromDateInput && this.toDateInput && this.fromDateInput > this.toDateInput) {
            [this.fromDateInput, this.toDateInput] = [this.toDateInput, this.fromDateInput];
        }

        this.page.set(1);
        this.reload();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.modalityInput = null;
        this.fromDateInput = '';
        this.toDateInput = '';
        this.statusInput = '';
        this.applyFilters();
    }

    clearContextFilter(): void {
        this.contextPetId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.applyFilters();
    }

    onPageChange(state: PaginatorState): void {
        this.pageSize.set(state.rows ?? this.pageSize());
        this.page.set(Math.floor((state.first ?? 0) / this.pageSize()) + 1);
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.imagingService
            .list({
                page: this.page(),
                pageSize: this.pageSize(),
                search: this.searchInput.trim() || undefined,
                petId: this.contextPetId() || undefined,
                modality: this.modalityInput ?? undefined,
                status: this.statusInput || undefined,
                fromDate: this.fromDateInput || undefined,
                toDate: this.toDateInput || undefined
            })
            .subscribe({
                next: (r) => {
                    this.rows.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message);
                    this.loading.set(false);
                }
            });
    }
}

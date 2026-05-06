import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import type { ReminderLogItemVm } from '@/app/features/reminders/models/reminder-log-vm.model';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { dateOnlyInputToUtcIso, dateOnlyInputToUtcIsoEndOfDay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

type ClinicSelectOption = { label: string; value: string };
type ReminderLogsListState = {
    reminderType: string;
    status: string;
    clinicId: string;
    fromDateInput: string;
    toDateInput: string;
    fromUtc: string | null;
    toUtc: string | null;
    page: number;
    pageSize: number;
};

const REMINDER_LOGS_LIST_STATE_KEY = 'reminderLogs:listState';

@Component({
    selector: 'app-reminder-logs-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        SelectModule,
        InputTextModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Hatırlatma Geçmişi" subtitle="Hesap" description="Gönderilen veya kuyruğa alınan hatırlatmaları takip edin." />

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Hatırlatma geçmişi yükleniyor…" />
            } @else if (error()) {
                <app-error-state title="Hatırlatma geçmişi yüklenemedi." [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-12 gap-3 items-end pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div
                            class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                            [ngClass]="
                                isReminderTypeActive()
                                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                    : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                            "
                        >
                            <span class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="isReminderTypeActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'">
                                Tür
                                @if (isReminderTypeActive()) {
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                        Aktif
                                    </span>
                                }
                            </span>
                            <p-select
                                [options]="reminderTypeOptions"
                                [(ngModel)]="reminderTypeFilter"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tümü"
                                styleClass="w-full"
                                [showClear]="true"
                            />
                        </div>
                        <div
                            class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                            [ngClass]="
                                isStatusActive()
                                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                    : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                            "
                        >
                            <span class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="isStatusActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'">
                                Durum
                                @if (isStatusActive()) {
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                        Aktif
                                    </span>
                                }
                            </span>
                            <p-select
                                [options]="statusOptions"
                                [(ngModel)]="statusFilter"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tümü"
                                styleClass="w-full"
                                [showClear]="true"
                            />
                        </div>
                        <div
                            class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                            [ngClass]="
                                isClinicActive()
                                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                    : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                            "
                        >
                            <span class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="isClinicActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'">
                                Klinik
                                @if (isClinicActive()) {
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                        Aktif
                                    </span>
                                }
                            </span>
                            <p-select
                                [options]="clinicOptions()"
                                [(ngModel)]="clinicFilter"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tüm klinikler"
                                styleClass="w-full"
                                [showClear]="true"
                                [loading]="clinicsLoading()"
                                [filter]="true"
                                filterBy="label"
                            />
                        </div>
                        <div
                            class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                            [ngClass]="
                                isFromDateActive()
                                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                    : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                            "
                        >
                            <label
                                for="remLogFrom"
                                class="flex items-center gap-2 text-xs font-medium mb-1"
                                [ngClass]="isFromDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                            >
                                Başlangıç tarihi
                                @if (isFromDateActive()) {
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                        Aktif
                                    </span>
                                }
                            </label>
                            <input
                                id="remLogFrom"
                                type="date"
                                class="w-full p-inputtext p-component"
                                [ngClass]="isFromDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                [(ngModel)]="fromDateInput"
                            />
                        </div>
                        <div
                            class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                            [ngClass]="
                                isToDateActive()
                                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                    : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                            "
                        >
                            <label
                                for="remLogTo"
                                class="flex items-center gap-2 text-xs font-medium mb-1"
                                [ngClass]="isToDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                            >
                                Bitiş tarihi
                                @if (isToDateActive()) {
                                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                        Aktif
                                    </span>
                                }
                            </label>
                            <input
                                id="remLogTo"
                                type="date"
                                class="w-full p-inputtext p-component"
                                [ngClass]="isToDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                [(ngModel)]="toDateInput"
                            />
                        </div>
                        <div class="col-span-12 md:col-span-4 flex flex-wrap gap-2">
                            <p-button size="small" icon="pi pi-filter" label="Filtrele" (onClick)="applyFilters()" />
                            <p-button size="small" icon="pi pi-times" label="Temizle" severity="secondary" (onClick)="clearFilters()" />
                        </div>
                    </div>

                    @if (displayedRows().length === 0) {
                        @if (hasActiveFilters()) {
                            <app-empty-state
                                message="Seçili filtrelere uygun hatırlatma kaydı bulunamadı."
                                hint="Filtreleri temizleyerek tüm kayıtları görüntüleyebilirsiniz."
                            >
                                <p-button type="button" size="small" severity="secondary" icon="pi pi-times" label="Filtreleri temizle" (onClick)="clearFilters()" />
                            </app-empty-state>
                        } @else {
                            <app-empty-state message="Henüz gönderilmiş hatırlatma bulunmuyor." />
                        }
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
                                [tableStyle]="{ 'min-width': '70rem' }"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Tür</th>
                                        <th>Alıcı</th>
                                        <th>Durum</th>
                                        <th>İlgili kayıt</th>
                                        <th>Hata</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatDateTime(row.primaryDateUtc) }}</td>
                                        <td>{{ row.reminderTypeLabel }}</td>
                                        <td class="break-words">{{ row.recipientDisplay }}</td>
                                        <td class="whitespace-nowrap">
                                            <span class="inline-flex items-center w-auto max-w-fit whitespace-nowrap">
                                                <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                            </span>
                                        </td>
                                        <td class="break-words">
                                            @if (row.relatedRecordRoute) {
                                                <a [routerLink]="row.relatedRecordRoute" class="text-primary font-medium no-underline">
                                                    {{ row.relatedRecordLabel }}
                                                </a>
                                            } @else {
                                                {{ row.relatedRecordLabel }}
                                            }
                                        </td>
                                        <td class="break-words">{{ row.errorDisplay }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="lg:hidden space-y-3">
                            @for (row of displayedRows(); track row.id) {
                                <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4">
                                    <div class="flex items-center justify-between gap-2 mb-2">
                                        <div class="text-sm font-medium">{{ formatDateTime(row.primaryDateUtc) }}</div>
                                        <span class="inline-flex items-center w-auto max-w-fit whitespace-nowrap">
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </span>
                                    </div>
                                    <div class="text-sm mb-1"><span class="text-muted-color">Tür: </span>{{ row.reminderTypeLabel }}</div>
                                    <div class="text-sm mb-1 break-words"><span class="text-muted-color">Alıcı: </span>{{ row.recipientDisplay }}</div>
                                    <div class="text-sm mb-1 break-words">
                                        <span class="text-muted-color">İlgili kayıt: </span>
                                        @if (row.relatedRecordRoute) {
                                            <a [routerLink]="row.relatedRecordRoute" class="text-primary font-medium no-underline">
                                                {{ row.relatedRecordLabel }}
                                            </a>
                                        } @else {
                                            {{ row.relatedRecordLabel }}
                                        }
                                    </div>
                                    <div class="text-sm break-words"><span class="text-muted-color">Hata: </span>{{ row.errorDisplay }}</div>
                                </div>
                            }
                        </div>

                        <div class="lg:hidden mt-4">
                            <p-paginator
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [first]="first()"
                                [rowsPerPageOptions]="[20, 50]"
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class ReminderLogsPageComponent implements OnInit {
    private readonly reminders = inject(RemindersService);
    private readonly clinics = inject(ClinicsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ReminderLogItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    reminderTypeFilter = '';
    statusFilter = '';
    clinicFilter = '';
    fromDateInput = '';
    toDateInput = '';

    readonly activeReminderType = signal('');
    readonly activeStatus = signal('');
    readonly activeClinicId = signal('');
    readonly activeFromUtc = signal<string | undefined>(undefined);
    readonly activeToUtc = signal<string | undefined>(undefined);

    readonly clinicOptions = signal<ClinicSelectOption[]>([{ label: 'Tüm klinikler', value: '' }]);
    readonly clinicsLoading = signal(false);

    readonly reminderTypeOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Randevu', value: 'Appointment' },
        { label: 'Aşı', value: 'Vaccination' }
    ];

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Bekliyor', value: 'Pending' },
        { label: 'Kuyruğa alındı', value: 'Enqueued' },
        { label: 'Gönderildi', value: 'Sent' },
        { label: 'Başarısız', value: 'Failed' },
        { label: 'Atlandı', value: 'Skipped' }
    ];

    readonly displayedRows = computed(() => this.rows());
    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly hasActiveFilters = computed(
        () =>
            !!this.activeReminderType().trim() ||
            !!this.activeStatus().trim() ||
            !!this.activeClinicId().trim() ||
            !!this.fromDateInput.trim() ||
            !!this.toDateInput.trim()
    );

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        const restored = this.restoreStateFromSessionStorage();
        this.loadClinicOptions(() => {
            this.loadFromServer(
                restored?.page ?? 1,
                restored?.pageSize ?? this.pageSize(),
                this.activeReminderType(),
                this.activeStatus(),
                this.activeClinicId(),
                this.activeFromUtc(),
                this.activeToUtc()
            );
        });
    }

    private loadClinicOptions(onLoaded: () => void): void {
        this.clinicsLoading.set(true);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const opts: ClinicSelectOption[] = [
                    { label: 'Tüm klinikler', value: '' },
                    ...list.map((c) => ({ label: c.name, value: c.id }))
                ];
                this.clinicOptions.set(opts);
                const activeClinicId = this.activeClinicId().trim();
                if (activeClinicId && !list.some((c) => c.id === activeClinicId)) {
                    this.clinicFilter = '';
                    this.activeClinicId.set('');
                    this.persistStateToSessionStorage(this.currentPage(), this.pageSize());
                }
                this.clinicsLoading.set(false);
                onLoaded();
            },
            error: () => {
                this.clinicOptions.set([{ label: 'Tüm klinikler', value: '' }]);
                this.clinicsLoading.set(false);
                onLoaded();
            }
        });
    }

    applyFilters(): void {
        let from = this.fromDateInput?.trim() ?? '';
        let to = this.toDateInput?.trim() ?? '';
        if (from && to && from > to) {
            const t = from;
            from = to;
            to = t;
            this.fromDateInput = from;
            this.toDateInput = to;
        }

        const fromUtc = from ? dateOnlyInputToUtcIso(from) : undefined;
        const toUtc = to ? dateOnlyInputToUtcIsoEndOfDay(to) : undefined;

        this.activeReminderType.set(this.reminderTypeFilter || '');
        this.activeStatus.set(this.statusFilter || '');
        this.activeClinicId.set(this.clinicFilter?.trim() || '');
        this.activeFromUtc.set(fromUtc || undefined);
        this.activeToUtc.set(toUtc || undefined);
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(
            1,
            this.pageSize(),
            this.activeReminderType(),
            this.activeStatus(),
            this.activeClinicId(),
            this.activeFromUtc(),
            this.activeToUtc()
        );
    }

    clearFilters(): void {
        this.reminderTypeFilter = '';
        this.statusFilter = '';
        this.clinicFilter = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeReminderType.set('');
        this.activeStatus.set('');
        this.activeClinicId.set('');
        this.activeFromUtc.set(undefined);
        this.activeToUtc.set(undefined);
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.lastLoadKey = '';
        this.loadFromServer(1, this.pageSize(), '', '', '', undefined, undefined, true);
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeReminderType(),
            this.activeStatus(),
            this.activeClinicId(),
            this.activeFromUtc(),
            this.activeToUtc(),
            true
        );
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 20;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(
            page,
            rows,
            this.activeReminderType(),
            this.activeStatus(),
            this.activeClinicId(),
            this.activeFromUtc(),
            this.activeToUtc()
        );
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(
            page,
            rows,
            this.activeReminderType(),
            this.activeStatus(),
            this.activeClinicId(),
            this.activeFromUtc(),
            this.activeToUtc()
        );
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        reminderType: string,
        status: string,
        clinicId: string,
        fromUtc: string | undefined,
        toUtc: string | undefined,
        force = false
    ): void {
        const cid = clinicId.trim();
        const key = `${page}|${pageSize}|${reminderType}|${status}|${cid}|${fromUtc ?? ''}|${toUtc ?? ''}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.reminders
            .getLogs({
                page,
                pageSize,
                reminderType: reminderType || undefined,
                status: status || undefined,
                clinicId: cid || undefined,
                fromUtc,
                toUtc
            })
            .subscribe({
                next: (res) => {
                    this.rows.set(res.items);
                    this.totalItems.set(res.totalItems);
                    this.pageSize.set(res.pageSize);
                    this.currentPage.set(res.page);
                    this.first.set((res.page - 1) * res.pageSize);
                    this.persistStateToSessionStorage(res.page, res.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Hatırlatma geçmişi yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }

    private restoreStateFromSessionStorage(): { page: number; pageSize: number } | null {
        const raw = sessionStorage.getItem(REMINDER_LOGS_LIST_STATE_KEY);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<ReminderLogsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(REMINDER_LOGS_LIST_STATE_KEY);
                return null;
            }

            this.reminderTypeFilter = typeof parsed.reminderType === "string" ? parsed.reminderType : '';
            this.statusFilter = typeof parsed.status === "string" ? parsed.status : '';
            this.clinicFilter = typeof parsed.clinicId === "string" ? parsed.clinicId : '';
            this.fromDateInput = typeof parsed.fromDateInput === "string" ? parsed.fromDateInput : '';
            this.toDateInput = typeof parsed.toDateInput === "string" ? parsed.toDateInput : '';

            this.activeReminderType.set(this.reminderTypeFilter);
            this.activeStatus.set(this.statusFilter);
            this.activeClinicId.set(this.clinicFilter);
            this.activeFromUtc.set(typeof parsed.fromUtc === 'string' && parsed.fromUtc.trim() ? parsed.fromUtc : undefined);
            this.activeToUtc.set(typeof parsed.toUtc === 'string' && parsed.toUtc.trim() ? parsed.toUtc : undefined);

            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);
            return { page, pageSize };
        } catch {
            sessionStorage.removeItem(REMINDER_LOGS_LIST_STATE_KEY);
            return null;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: ReminderLogsListState = {
            reminderType: this.activeReminderType(),
            status: this.activeStatus(),
            clinicId: this.activeClinicId(),
            fromDateInput: this.fromDateInput,
            toDateInput: this.toDateInput,
            fromUtc: this.activeFromUtc() ?? null,
            toUtc: this.activeToUtc() ?? null,
            page,
            pageSize
        };
        sessionStorage.setItem(REMINDER_LOGS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(REMINDER_LOGS_LIST_STATE_KEY);
    }

    isReminderTypeActive(): boolean {
        return !!this.activeReminderType().trim();
    }

    isStatusActive(): boolean {
        return !!this.activeStatus().trim();
    }

    isClinicActive(): boolean {
        return !!this.activeClinicId().trim();
    }

    isFromDateActive(): boolean {
        return !!this.fromDateInput.trim();
    }

    isToDateActive(): boolean {
        return !!this.toDateInput.trim();
    }
}

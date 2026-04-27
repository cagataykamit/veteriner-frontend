import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import type { ReminderLogItemVm } from '@/app/features/reminders/models/reminder-log-vm.model';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-reminder-logs-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        Paginator,
        SelectModule,
        InputTextModule,
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
                        <div class="col-span-12 md:col-span-4">
                            <span class="block text-xs font-medium text-muted-color mb-1">Tür</span>
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
                        <div class="col-span-12 md:col-span-4">
                            <span class="block text-xs font-medium text-muted-color mb-1">Durum</span>
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
                        <div class="col-span-12 md:col-span-4">
                            <button
                                class="p-button p-component p-button-sm"
                                type="button"
                                (click)="applyFilters()"
                            >
                                <span class="p-button-icon p-button-icon-left pi pi-filter"></span>
                                <span class="p-button-label">Filtrele</span>
                            </button>
                        </div>
                    </div>

                    @if (displayedRows().length === 0) {
                        <app-empty-state message="Henüz gönderilmiş hatırlatma bulunmuyor." />
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
                                        <td><app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" /></td>
                                        <td class="break-words">{{ row.relatedRecordDisplay }}</td>
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
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </div>
                                    <div class="text-sm mb-1"><span class="text-muted-color">Tür: </span>{{ row.reminderTypeLabel }}</div>
                                    <div class="text-sm mb-1 break-words"><span class="text-muted-color">Alıcı: </span>{{ row.recipientDisplay }}</div>
                                    <div class="text-sm mb-1 break-words"><span class="text-muted-color">İlgili kayıt: </span>{{ row.relatedRecordDisplay }}</div>
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

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ReminderLogItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    reminderTypeFilter = '';
    statusFilter = '';
    readonly activeReminderType = signal('');
    readonly activeStatus = signal('');

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
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeReminderType(), this.activeStatus());
    }

    applyFilters(): void {
        this.activeReminderType.set(this.reminderTypeFilter || '');
        this.activeStatus.set(this.statusFilter || '');
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeReminderType(), this.activeStatus());
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeReminderType(), this.activeStatus(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 20;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeReminderType(), this.activeStatus());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.loadFromServer(page, rows, this.activeReminderType(), this.activeStatus());
    }

    private loadFromServer(page: number, pageSize: number, reminderType: string, status: string, force = false): void {
        const key = `${page}|${pageSize}|${reminderType}|${status}`;
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
                status: status || undefined
            })
            .subscribe({
                next: (res) => {
                    this.rows.set(res.items);
                    this.totalItems.set(res.totalItems);
                    this.pageSize.set(res.pageSize);
                    this.currentPage.set(res.page);
                    this.first.set((res.page - 1) * res.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Hatırlatma geçmişi yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import type {
    AppointmentCalendarDayGroupVm,
    AppointmentCalendarItemVm
} from '@/app/features/appointments/models/appointment-calendar-vm.model';
import { groupCalendarItemsByDay } from '@/app/features/appointments/data/appointment-calendar.mapper';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, localDateYyyyMmDd, parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

type CalendarViewMode = 'day' | 'week';
type CalendarPreset = 'overdue-appointments' | 'upcoming-24h' | 'today-cancelled';

@Component({
    selector: 'app-appointments-calendar-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header [title]="pageTitle()" subtitle="Operasyon" [description]="pageDescription()">
            @if (!ro.mutationBlocked()) {
                <button actions pButton type="button" label="Yeni Randevu" icon="pi pi-plus" class="p-button-primary" (click)="createAppointment()"></button>
            } @else {
                <button actions pButton type="button" label="Yeni Randevu (salt okunur)" icon="pi pi-lock" class="p-button-secondary" [disabled]="true"></button>
            }
        </app-page-header>

        <div class="card">
            @if (!isPresetDateGroupedMode()) {
                <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2">
                        <p-button
                            [severity]="viewMode() === 'day' ? undefined : 'secondary'"
                            label="Gün"
                            size="small"
                            (onClick)="changeViewMode('day')"
                        />
                        <p-button
                            [severity]="viewMode() === 'week' ? undefined : 'secondary'"
                            label="Hafta"
                            size="small"
                            (onClick)="changeViewMode('week')"
                        />
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <p-button severity="secondary" size="small" icon="pi pi-angle-left" label="Önceki" (onClick)="previous()" />
                        <p-button severity="secondary" size="small" label="Bugün" (onClick)="goToday()" />
                        <p-button severity="secondary" size="small" iconPos="right" icon="pi pi-angle-right" label="Sonraki" (onClick)="next()" />
                    </div>
                </div>
            }

            @if (!isPresetDateGroupedMode()) {
                <p class="text-sm text-muted-color mt-0 mb-4">{{ rangeLabel() }}</p>
            }
            @if (activePreset(); as preset) {
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <span class="text-sm text-muted-color">{{ presetHelperText(preset) }}</span>
                    <button pButton type="button" size="small" text="true" label="Filtreyi temizle" icon="pi pi-times" (click)="clearPreset()"></button>
                </div>
            }

            @if (loading()) {
                <app-loading-state message="Takvim verileri yükleniyor…" />
            } @else if (error(); as err) {
                <app-error-state [detail]="err" (retry)="reload()" />
            } @else if (items().length === 0) {
                <app-empty-state message="Bu tarih aralığında randevu bulunmuyor." hint="Yeni randevu oluşturarak takvime kayıt ekleyin.">
                    @if (!ro.mutationBlocked()) {
                        <button pButton type="button" label="Yeni randevu oluştur" icon="pi pi-plus" (click)="createAppointment()"></button>
                    }
                </app-empty-state>
            } @else if (isPresetDateGroupedMode()) {
                <div class="flex flex-col gap-4">
                    @for (day of presetGroupedByDate(); track day.dateKey) {
                        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                            <h6 class="m-0 mb-3 text-sm font-semibold">{{ day.dateLabel }}</h6>
                            <div class="flex flex-col gap-2">
                                @for (item of day.items; track item.id) {
                                    <article class="rounded-md border border-surface-200 dark:border-surface-700 px-2 py-2">
                                        <div
                                            class="grid items-center gap-2 w-full min-h-9"
                                            style="grid-template-columns: 52px minmax(120px, 1.4fr) minmax(140px, 1.6fr) 88px 112px 30px 30px;"
                                        >
                                            <span
                                                class="inline-flex items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold whitespace-nowrap"
                                                >{{ item.timeLabel }}</span
                                            >
                                            <div class="flex items-center min-w-0">
                                                <p class="m-0 text-sm font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.petName">
                                                    {{ item.petName }}
                                                </p>
                                            </div>
                                            <div class="flex items-center min-w-0">
                                                <p class="m-0 text-sm text-muted-color min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.clientName">
                                                    {{ item.clientName }}
                                                </p>
                                            </div>
                                            <div class="flex items-center justify-start whitespace-nowrap">
                                                <app-status-tag [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                            </div>
                                            <div class="flex items-center justify-start whitespace-nowrap">
                                                <app-status-tag [label]="item.appointmentTypeLabel" severity="secondary" />
                                            </div>
                                            <div class="flex items-center justify-center shrink-0">
                                                <button
                                                    pButton
                                                    type="button"
                                                    size="small"
                                                    text="true"
                                                    rounded="true"
                                                    icon="pi pi-eye"
                                                    class="h-7 w-7 p-0"
                                                    [attr.aria-label]="'Randevu detayını görüntüle'"
                                                    title="Detay"
                                                    (click)="openDetail(item.id)"
                                                ></button>
                                            </div>
                                            <div class="flex items-center justify-center shrink-0">
                                                <button
                                                    pButton
                                                    type="button"
                                                    size="small"
                                                    text="true"
                                                    rounded="true"
                                                    icon="pi pi-pencil"
                                                    class="h-7 w-7 p-0"
                                                    [attr.aria-label]="'Randevuyu düzenle'"
                                                    title="Düzenle"
                                                    (click)="openEdit(item.id)"
                                                ></button>
                                            </div>
                                        </div>
                                    </article>
                                }
                            </div>
                        </section>
                    }
                </div>
            } @else {
                @if (viewMode() === 'day') {
                    <div class="hidden lg:grid 2xl:grid-cols-2 gap-4">
                        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-h-40">
                            <h6 class="m-0 mb-3 text-sm font-semibold">Sabah / Öğlene Kadar</h6>
                            @if (dayMorningItems().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                            } @else {
                                <div class="flex flex-col gap-2 max-h-[28rem] overflow-y-auto pr-1">
                                    @for (item of dayMorningItems(); track item.id) {
                                        <article class="rounded-md border border-surface-200 dark:border-surface-700 px-2 py-2">
                                            <div
                                                class="grid items-center gap-2 w-full min-h-9"
                                                style="grid-template-columns: 52px minmax(120px, 1.4fr) minmax(140px, 1.6fr) 88px 112px 30px 30px;"
                                            >
                                                <span
                                                    class="inline-flex items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold whitespace-nowrap"
                                                    >{{ item.timeLabel }}</span
                                                >
                                                <div class="flex items-center min-w-0">
                                                    <p class="m-0 text-sm font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.petName">
                                                        {{ item.petName }}
                                                    </p>
                                                </div>
                                                <div class="flex items-center min-w-0">
                                                    <p class="m-0 text-sm text-muted-color min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.clientName">
                                                        {{ item.clientName }}
                                                    </p>
                                                </div>
                                                <div class="flex items-center justify-start whitespace-nowrap">
                                                    <app-status-tag [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                </div>
                                                <div class="flex items-center justify-start whitespace-nowrap">
                                                    <app-status-tag [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                <div class="flex items-center justify-center shrink-0">
                                                    <button
                                                        pButton
                                                        type="button"
                                                        size="small"
                                                        text="true"
                                                        rounded="true"
                                                        icon="pi pi-eye"
                                                        class="h-7 w-7 p-0"
                                                        [attr.aria-label]="'Randevu detayını görüntüle'"
                                                        title="Detay"
                                                        (click)="openDetail(item.id)"
                                                    ></button>
                                                </div>
                                                <div class="flex items-center justify-center shrink-0">
                                                    <button
                                                        pButton
                                                        type="button"
                                                        size="small"
                                                        text="true"
                                                        rounded="true"
                                                        icon="pi pi-pencil"
                                                        class="h-7 w-7 p-0"
                                                        [attr.aria-label]="'Randevuyu düzenle'"
                                                        title="Düzenle"
                                                        (click)="openEdit(item.id)"
                                                    ></button>
                                                </div>
                                            </div>
                                        </article>
                                    }
                                </div>
                            }
                        </section>
                        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-h-40">
                            <h6 class="m-0 mb-3 text-sm font-semibold">Öğleden Sonra / Akşam</h6>
                            @if (dayAfternoonItems().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                            } @else {
                                <div class="flex flex-col gap-2 max-h-[28rem] overflow-y-auto pr-1">
                                    @for (item of dayAfternoonItems(); track item.id) {
                                        <article class="rounded-md border border-surface-200 dark:border-surface-700 px-2 py-2">
                                            <div
                                                class="grid items-center gap-2 w-full min-h-9"
                                                style="grid-template-columns: 52px minmax(120px, 1.4fr) minmax(140px, 1.6fr) 88px 112px 30px 30px;"
                                            >
                                                <span
                                                    class="inline-flex items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold whitespace-nowrap"
                                                    >{{ item.timeLabel }}</span
                                                >
                                                <div class="flex items-center min-w-0">
                                                    <p class="m-0 text-sm font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.petName">
                                                        {{ item.petName }}
                                                    </p>
                                                </div>
                                                <div class="flex items-center min-w-0">
                                                    <p class="m-0 text-sm text-muted-color min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" [title]="item.clientName">
                                                        {{ item.clientName }}
                                                    </p>
                                                </div>
                                                <div class="flex items-center justify-start whitespace-nowrap">
                                                    <app-status-tag [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                </div>
                                                <div class="flex items-center justify-start whitespace-nowrap">
                                                    <app-status-tag [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                <div class="flex items-center justify-center shrink-0">
                                                    <button
                                                        pButton
                                                        type="button"
                                                        size="small"
                                                        text="true"
                                                        rounded="true"
                                                        icon="pi pi-eye"
                                                        class="h-7 w-7 p-0"
                                                        [attr.aria-label]="'Randevu detayını görüntüle'"
                                                        title="Detay"
                                                        (click)="openDetail(item.id)"
                                                    ></button>
                                                </div>
                                                <div class="flex items-center justify-center shrink-0">
                                                    <button
                                                        pButton
                                                        type="button"
                                                        size="small"
                                                        text="true"
                                                        rounded="true"
                                                        icon="pi pi-pencil"
                                                        class="h-7 w-7 p-0"
                                                        [attr.aria-label]="'Randevuyu düzenle'"
                                                        title="Düzenle"
                                                        (click)="openEdit(item.id)"
                                                    ></button>
                                                </div>
                                            </div>
                                        </article>
                                    }
                                </div>
                            }
                        </section>
                    </div>
                } @else {
                    <div class="hidden lg:grid grid-cols-1 gap-4 xl:grid-cols-7">
                        @for (day of daysForDesktop(); track day.dateKey) {
                            <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-h-40">
                                <h6 class="m-0 mb-3 text-sm font-semibold">{{ day.dateLabel }}</h6>
                                @if (day.items.length === 0) {
                                    <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                                } @else {
                                    <div class="flex flex-col gap-2">
                                        @for (item of day.items; track item.id) {
                                            <article class="rounded-md border border-surface-200 dark:border-surface-700 p-2">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xs font-medium shrink-0">{{ item.timeLabel }}</span>
                                                </div>
                                                <p class="m-0 mt-1 text-sm font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{{ item.petName }}</p>
                                                <p class="m-0 text-sm text-muted-color min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {{ item.clientName }}
                                                </p>
                                                <div class="mt-1 flex flex-wrap items-center gap-1 min-w-0">
                                                    <app-status-tag class="shrink-0" [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                    <app-status-tag class="shrink-0" [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                <div class="mt-2 flex gap-2">
                                                    <button pButton type="button" size="small" text="true" label="Detay" (click)="openDetail(item.id)"></button>
                                                    <button pButton type="button" size="small" text="true" label="Düzenle" (click)="openEdit(item.id)"></button>
                                                </div>
                                            </article>
                                        }
                                    </div>
                                }
                            </section>
                        }
                    </div>
                }

                <div class="lg:hidden flex flex-col gap-4">
                    @if (viewMode() === 'day') {
                        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                            <h6 class="m-0 mb-3 text-sm font-semibold">Sabah / Öğlene Kadar</h6>
                            @if (dayMorningItems().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                            } @else {
                                <div class="flex flex-col gap-2 max-h-[28rem] overflow-y-auto pr-1">
                                    @for (item of dayMorningItems(); track item.id) {
                                        <article class="rounded-md border border-surface-200 dark:border-surface-700 px-2 py-2">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <div class="shrink-0 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold">
                                                    {{ item.timeLabel }}
                                                </div>
                                                <div class="min-w-0 flex-1 text-sm">
                                                    <p class="m-0 font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {{ item.petName }} <span class="text-muted-color font-normal">· {{ item.clientName }}</span>
                                                    </p>
                                                </div>
                                                <div class="flex flex-wrap items-center gap-1 min-w-0">
                                                    <app-status-tag class="shrink-0" [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                    <app-status-tag class="shrink-0" [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                    <div class="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                                        <button
                                                            pButton
                                                            type="button"
                                                            size="small"
                                                            text="true"
                                                            rounded="true"
                                                            icon="pi pi-eye"
                                                            [attr.aria-label]="'Randevu detayını görüntüle'"
                                                            title="Detay"
                                                            (click)="openDetail(item.id)"
                                                        ></button>
                                                        <button
                                                            pButton
                                                            type="button"
                                                            size="small"
                                                            text="true"
                                                            rounded="true"
                                                            icon="pi pi-pencil"
                                                            [attr.aria-label]="'Randevuyu düzenle'"
                                                            title="Düzenle"
                                                            (click)="openEdit(item.id)"
                                                        ></button>
                                                </div>
                                            </div>
                                        </article>
                                    }
                                </div>
                            }
                        </section>
                        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                            <h6 class="m-0 mb-3 text-sm font-semibold">Öğleden Sonra / Akşam</h6>
                            @if (dayAfternoonItems().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                            } @else {
                                <div class="flex flex-col gap-2 max-h-[28rem] overflow-y-auto pr-1">
                                    @for (item of dayAfternoonItems(); track item.id) {
                                        <article class="rounded-md border border-surface-200 dark:border-surface-700 px-2 py-2">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <div class="shrink-0 rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold">
                                                    {{ item.timeLabel }}
                                                </div>
                                                <div class="min-w-0 flex-1 text-sm">
                                                    <p class="m-0 font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {{ item.petName }} <span class="text-muted-color font-normal">· {{ item.clientName }}</span>
                                                    </p>
                                                </div>
                                                <div class="flex flex-wrap items-center gap-1 min-w-0">
                                                    <app-status-tag class="shrink-0" [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                    <app-status-tag class="shrink-0" [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                    <div class="inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                                        <button
                                                            pButton
                                                            type="button"
                                                            size="small"
                                                            text="true"
                                                            rounded="true"
                                                            icon="pi pi-eye"
                                                            [attr.aria-label]="'Randevu detayını görüntüle'"
                                                            title="Detay"
                                                            (click)="openDetail(item.id)"
                                                        ></button>
                                                        <button
                                                            pButton
                                                            type="button"
                                                            size="small"
                                                            text="true"
                                                            rounded="true"
                                                            icon="pi pi-pencil"
                                                            [attr.aria-label]="'Randevuyu düzenle'"
                                                            title="Düzenle"
                                                            (click)="openEdit(item.id)"
                                                        ></button>
                                                </div>
                                            </div>
                                        </article>
                                    }
                                </div>
                            }
                        </section>
                    } @else {
                        @for (day of groupedByDay(); track day.dateKey) {
                            <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <h6 class="m-0 mb-3 text-sm font-semibold">{{ day.dateLabel }}</h6>
                                @if (day.items.length === 0) {
                                    <p class="m-0 text-sm text-muted-color">Randevu yok.</p>
                                } @else {
                                    <div class="flex flex-col gap-2">
                                        @for (item of day.items; track item.id) {
                                            <article class="rounded-md border border-surface-200 dark:border-surface-700 p-2">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xs font-medium shrink-0">{{ item.timeLabel }}</span>
                                                </div>
                                                <p class="m-0 mt-1 text-sm font-semibold min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{{ item.petName }}</p>
                                                <p class="m-0 text-sm text-muted-color min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {{ item.clientName }}
                                                </p>
                                                <div class="mt-1 flex flex-wrap items-center gap-1 min-w-0">
                                                    <app-status-tag class="shrink-0" [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                                    <app-status-tag class="shrink-0" [label]="item.appointmentTypeLabel" severity="secondary" />
                                                </div>
                                                <div class="mt-2 flex gap-2">
                                                    <button pButton type="button" size="small" text="true" label="Detay" (click)="openDetail(item.id)"></button>
                                                    <button pButton type="button" size="small" text="true" label="Düzenle" (click)="openEdit(item.id)"></button>
                                                </div>
                                            </article>
                                        }
                                    </div>
                                }
                            </section>
                        }
                    }
                </div>
            }
        </div>
    `
})
export class AppointmentsCalendarPageComponent implements OnInit {
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly appointments = inject(AppointmentsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly viewMode = signal<CalendarViewMode>('day');
    readonly selectedDate = signal(new Date());
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly items = signal<AppointmentCalendarItemVm[]>([]);
    readonly activePreset = signal<CalendarPreset | null>(null);

    readonly groupedByDay = computed(() => groupCalendarItemsByDay(this.items()));
    readonly presetGroupedByDate = computed(() => this.groupedByDay());
    readonly dayMorningItems = computed(() => this.items().filter((item) => this.getLocalHour(item) < 13));
    readonly dayAfternoonItems = computed(() => this.items().filter((item) => this.getLocalHour(item) >= 13));
    readonly rangeLabel = computed(() => {
        const { start, endExclusive } = this.getDateRange();
        if (this.viewMode() === 'day') {
            return formatDateDisplay(start);
        }
        const endDisplay = new Date(endExclusive);
        endDisplay.setDate(endDisplay.getDate() - 1);
        return `${formatDateDisplay(start)} - ${formatDateDisplay(endDisplay)}`;
    });

    readonly daysForDesktop = computed(() => {
        if (this.viewMode() === 'day') {
            return this.groupedByDay();
        }
        const { start } = this.getDateRange();
        const groups = new Map(this.groupedByDay().map((g) => [g.dateKey, g]));
        return Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(start);
            d.setDate(start.getDate() + idx);
            const key = localDateYyyyMmDd(d);
            return (
                groups.get(key) ?? {
                    dateKey: key,
                    dateLabel: formatDateDisplay(d),
                    items: []
                }
            );
        });
    });

    ngOnInit(): void {
        this.route.queryParamMap.subscribe((params) => {
            const raw = params.get('preset');
            const preset = this.toPreset(raw);
            this.activePreset.set(preset);
            if (preset) {
                this.viewMode.set('day');
                this.selectedDate.set(new Date());
            }
            this.reload();
        });
    }

    changeViewMode(mode: CalendarViewMode): void {
        if (this.viewMode() === mode) {
            return;
        }
        this.viewMode.set(mode);
        this.reload();
    }

    previous(): void {
        const d = new Date(this.selectedDate());
        d.setDate(d.getDate() - (this.viewMode() === 'day' ? 1 : 7));
        this.selectedDate.set(d);
        this.reload();
    }

    next(): void {
        const d = new Date(this.selectedDate());
        d.setDate(d.getDate() + (this.viewMode() === 'day' ? 1 : 7));
        this.selectedDate.set(d);
        this.reload();
    }

    goToday(): void {
        this.selectedDate.set(new Date());
        this.reload();
    }

    reload(): void {
        const presetQuery = this.presetQuery();
        const start = presetQuery?.start ?? this.getDateRange().start;
        const endExclusive = presetQuery?.endExclusive ?? this.getDateRange().endExclusive;
        this.loading.set(true);
        this.error.set(null);
        this.appointments
            .getCalendarAppointments({
                dateFromUtc: start.toISOString(),
                dateToUtc: endExclusive.toISOString(),
                status: presetQuery?.status
            })
            .subscribe({
                next: (res) => {
                    this.items.set(res);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Takvim verileri yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }

    openDetail(id: string): void {
        void this.router.navigate(['/panel/appointments', id], {
            queryParams: this.returnContextQueryParams()
        });
    }

    openEdit(id: string): void {
        void this.router.navigate(['/panel/appointments', id, 'edit'], {
            queryParams: this.returnContextQueryParams()
        });
    }

    createAppointment(): void {
        void this.router.navigate(['/panel/appointments/new']);
    }

    pageTitle(): string {
        const preset = this.activePreset();
        if (preset === 'overdue-appointments') {
            return 'Zamanı Geçmiş Randevular';
        }
        if (preset === 'upcoming-24h') {
            return 'Önümüzdeki 24 Saatteki Randevular';
        }
        if (preset === 'today-cancelled') {
            return 'Bugün İptal Edilen Randevular';
        }
        return 'Randevu Takvimi';
    }

    pageDescription(): string {
        const preset = this.activePreset();
        if (preset === 'overdue-appointments') {
            return 'Planlanan zamanı geçmiş ve hâlâ tamamlanmamış randevular.';
        }
        if (preset === 'upcoming-24h') {
            return 'Önümüzdeki 24 saat içinde planlanan randevular.';
        }
        if (preset === 'today-cancelled') {
            return 'Bugün iptal edilen randevuların listesi.';
        }
        return 'Günlük ve haftalık randevu akışını takip edin.';
    }

    clearPreset(): void {
        this.activePreset.set(null);
        void this.router.navigate(['/panel/appointments/calendar']);
    }

    private getDateRange(): { start: Date; endExclusive: Date } {
        if (this.viewMode() === 'day') {
            const start = this.startOfDay(this.selectedDate());
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return { start, endExclusive: end };
        }
        const start = this.startOfWeekMonday(this.selectedDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, endExclusive: end };
    }

    private startOfDay(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    }

    private startOfWeekMonday(date: Date): Date {
        const start = this.startOfDay(date);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        return start;
    }

    private getLocalHour(item: AppointmentCalendarItemVm): number {
        const d = parseUtcApiInstantIsoString(item.scheduledAtUtc);
        if (!d) {
            return 99;
        }
        return d.getHours();
    }

    private toPreset(value: string | null): CalendarPreset | null {
        if (value === 'overdue-appointments' || value === 'upcoming-24h' || value === 'today-cancelled') {
            return value;
        }
        return null;
    }

    private presetQuery(): { start: Date; endExclusive: Date; status?: string } | null {
        const now = new Date();
        const preset = this.activePreset();
        if (!preset) {
            return null;
        }
        if (preset === 'overdue-appointments') {
            const start = new Date(now);
            start.setDate(start.getDate() - 45);
            return { start, endExclusive: now, status: 'Scheduled' };
        }
        if (preset === 'upcoming-24h') {
            const end = new Date(now);
            end.setHours(end.getHours() + 24);
            return { start: now, endExclusive: end, status: 'Scheduled' };
        }
        const start = this.startOfDay(now);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, endExclusive: end, status: 'Cancelled' };
    }

    presetHelperText(preset: CalendarPreset): string {
        if (preset === 'overdue-appointments') {
            return 'Zamanı geçmiş randevular filtreleniyor.';
        }
        if (preset === 'upcoming-24h') {
            return 'Önümüzdeki 24 saat randevuları filtreleniyor.';
        }
        return 'Bugün iptal edilen randevular filtreleniyor.';
    }

    isPresetDateGroupedMode(): boolean {
        const preset = this.activePreset();
        return preset === 'overdue-appointments' || preset === 'upcoming-24h';
    }

    private returnContextQueryParams(): Record<string, string> {
        const returnUrl = this.router.url;
        return {
            returnUrl,
            returnLabel: this.returnLabelForContext()
        };
    }

    private returnLabelForContext(): string {
        const preset = this.activePreset();
        if (preset === 'overdue-appointments') {
            return 'Zamanı geçmiş randevulara dön';
        }
        if (preset === 'upcoming-24h') {
            return 'Önümüzdeki 24 saat randevularına dön';
        }
        if (preset === 'today-cancelled') {
            return 'Bugün iptal edilen randevulara dön';
        }
        return 'Randevu takvimine dön';
    }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CalendarDaySummaryVm } from '@/app/entities/appointment/models/calendar-day-summary.model';
import type { CalendarItemState } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { CALENDAR_STATES, calendarStateLabel, vaccineDotClass } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';

interface MonthCell {
    dateKey: string;
    dayNumber: number;
    inMonth: boolean;
    today: boolean;
    appointments: number;
    vaccines: number;
    total: number;
    /** Durum başına toplam (randevu + aşı), sıfırlar yok. */
    marks: { state: CalendarItemState; count: number }[];
    /** Telefonda tek nokta: en acil durum (gecikmiş, bugün, gelecek, tamamlanan). */
    urgent: CalendarItemState | null;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const URGENCY: readonly CalendarItemState[] = ['Overdue', 'DueToday', 'Upcoming', 'Completed'];

/**
 * Ay görünümü (kullanıcı isteği 2026-11-16, sözleşme §7): her gün özet, kart değil ("8 randevu · 23 aşı" ve durum işaretleri; planlı
 * aşılarla bir günde onlarca kayıt olabilir). Hücreye tıklayınca o günün gün görünümü. Bugün vurgulu, ay dışı günler soluk. Telefonda
 * yalnız toplam ve en acil durumun noktası.
 */
@Component({
    selector: 'app-appointment-calendar-month',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-border border border-surface overflow-hidden" data-testid="calendar-month">
            <div class="grid grid-cols-7 bg-surface-50 dark:bg-surface-950 border-b border-surface">
                @for (w of weekdays; track w) {
                    <div class="px-2 py-1.5 text-xs font-semibold text-muted-color">{{ w }}</div>
                }
            </div>
            @for (week of cells(); track week[0].dateKey) {
                <div class="grid grid-cols-7 border-b border-surface last:border-b-0">
                    @for (c of week; track c.dateKey) {
                        <button
                            type="button"
                            class="flex flex-col items-start justify-start text-left min-w-0 min-h-16 md:min-h-24 p-1 md:p-2 border-l border-surface first:border-l-0 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/60 focus-visible:outline-2 focus-visible:outline-primary"
                            [class.opacity-50]="!c.inMonth"
                            [class]="c.today ? 'bg-primary-50 dark:bg-primary-950' : ''"
                            [attr.aria-label]="ariaLabel(c)"
                            [attr.aria-current]="c.today ? 'date' : null"
                            (click)="dayOpen.emit(c.dateKey)"
                            [attr.data-testid]="'calendar-month-day-' + c.dateKey"
                        >
                            <span
                                class="inline-flex items-center justify-center min-w-6 h-6 rounded-full text-sm tabular-nums"
                                [class]="c.today ? 'bg-primary text-primary-contrast font-semibold' : 'font-medium'"
                                >{{ c.dayNumber }}</span
                            >
                            @if (c.total) {
                                <!-- Telefonda yalnız toplam ve en acil durumun noktası, gün numarasının altında. -->
                                <span class="md:hidden mt-0.5 inline-flex items-center gap-1 text-xs font-semibold tabular-nums">
                                    <span class="w-2 h-2 rounded-full shrink-0" [class]="dot(c.urgent!)" aria-hidden="true"></span>{{ c.total }}
                                </span>
                            }
                            @if (c.total) {
                                <span class="hidden md:block w-full mt-1 text-xs leading-4 text-surface-900 dark:text-surface-0 truncate">
                                    @if (c.appointments) {
                                        {{ c.appointments }} randevu
                                    }
                                    @if (c.appointments && c.vaccines) {
                                        ·
                                    }
                                    @if (c.vaccines) {
                                        <span class="whitespace-nowrap"><i class="pi pi-shield !text-[10px]" aria-hidden="true"></i> {{ c.vaccines }} aşı</span>
                                    }
                                </span>
                                <span class="hidden md:flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                    @for (m of c.marks; track m.state) {
                                        <span class="inline-flex items-center gap-1 text-[11px] leading-4 text-muted-color tabular-nums" [attr.title]="stateLabel(m.state)">
                                            <span class="w-2 h-2 rounded-full" [class]="dot(m.state)" aria-hidden="true"></span>{{ m.count }}
                                        </span>
                                    }
                                </span>
                            }
                        </button>
                    }
                </div>
            }
        </div>
    `
})
export class AppointmentCalendarMonthComponent {
    readonly weeks = input.required<string[][]>();
    /** Gösterilen ay (yyyy-MM); dışındaki günler soluk. */
    readonly monthKey = input.required<string>();
    readonly today = input.required<string>();
    readonly appointmentSummary = input<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());
    readonly vaccineSummary = input<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());

    readonly dayOpen = output<string>();

    protected readonly weekdays = WEEKDAYS;

    protected readonly cells = computed<MonthCell[][]>(() =>
        this.weeks().map((week) =>
            week.map((dateKey) => {
                const a = this.appointmentSummary().get(dateKey);
                const v = this.vaccineSummary().get(dateKey);
                const count = (s: CalendarItemState) => stateCount(a, s) + stateCount(v, s);
                const marks = CALENDAR_STATES.map((state) => ({ state, count: count(state) })).filter((m) => m.count > 0);

                return {
                    dateKey,
                    dayNumber: Number(dateKey.slice(8)),
                    inMonth: dateKey.startsWith(this.monthKey()),
                    today: dateKey === this.today(),
                    appointments: a?.total ?? 0,
                    vaccines: v?.total ?? 0,
                    total: (a?.total ?? 0) + (v?.total ?? 0),
                    marks,
                    urgent: URGENCY.find((s) => count(s) > 0) ?? null
                };
            })
        )
    );

    protected dot(state: CalendarItemState): string {
        return vaccineDotClass(state);
    }

    protected stateLabel(state: CalendarItemState): string {
        return calendarStateLabel(state);
    }

    protected ariaLabel(c: MonthCell): string {
        const parts = [`${c.dayNumber}`];

        if (c.appointments) {
            parts.push(`${c.appointments} randevu`);
        }

        if (c.vaccines) {
            parts.push(`${c.vaccines} aşı`);
        }

        parts.push(...c.marks.map((m) => `${m.count} ${calendarStateLabel(m.state).toLocaleLowerCase('tr')}`));

        return parts.join(', ');
    }
}

function stateCount(s: CalendarDaySummaryVm | undefined, state: CalendarItemState): number {
    if (!s) {
        return 0;
    }

    switch (state) {
        case 'DueToday':
            return s.dueToday;
        case 'Upcoming':
            return s.upcoming;
        case 'Overdue':
            return s.overdue;
        default:
            return s.completed;
    }
}

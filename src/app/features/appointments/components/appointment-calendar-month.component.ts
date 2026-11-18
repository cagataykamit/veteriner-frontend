import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CalendarDaySummaryVm } from '@/app/entities/appointment/models/calendar-day-summary.model';

interface MonthCell {
    dateKey: string;
    dayNumber: number;
    inMonth: boolean;
    today: boolean;
    appointments: number;
    vaccines: number;
    /** Randevu ve aşı gecikmişleri. */
    overdue: number;
    /** Kapasite 0 ve randevu yok: kapalı gün (taralı). */
    closed: boolean;
    /** 0–1; kapasite bilinmiyorsa `null` (renk yok). */
    load: number | null;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * Ay görünümü, A · Doluluk haritası (ux/takvim-yeniden-tasarim.md, kullanıcı seçimi 2026-11-18): hücrede büyük randevu sayısı, aşı sayısı ve
 * kırmızı "N gecikmiş" rozeti; hücrenin rengi günün doluluğuyla koyulaşır (randevu / kapasite; kapasite backend'de, sözleşme §8.4).
 * Tek tek randevu satırı yok; kapalı gün taralı; hücreye tıklayınca o günün gün görünümü.
 */
@Component({
    selector: 'app-appointment-calendar-month',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="rounded-border border border-surface overflow-hidden bg-surface-0 dark:bg-surface-900" data-testid="calendar-month">
            <div class="grid grid-cols-7 border-b border-surface-100 dark:border-surface-800">
                @for (w of weekdays; track w) {
                    <div class="px-2.5 py-1.5 text-xs font-semibold text-muted-color">{{ w }}</div>
                }
            </div>
            @for (week of cells(); track week[0].dateKey) {
                <div class="grid grid-cols-7 border-b border-surface-100 dark:border-surface-800 last:border-b-0">
                    @for (c of week; track c.dateKey) {
                        <button
                            type="button"
                            class="relative flex flex-col items-center justify-center min-w-0 h-16 md:h-[5.25rem] border-l border-surface-100 dark:border-surface-800 first:border-l-0 cursor-pointer hover:ring-2 hover:ring-inset hover:ring-primary-300 focus-visible:outline-2 focus-visible:outline-primary"
                            [class.opacity-40]="!c.inMonth"
                            [class.calendar-closed]="c.closed"
                            [class.ring-2]="c.today"
                            [class.ring-inset]="c.today"
                            [class.ring-primary]="c.today"
                            [style.background-color]="heat(c)"
                            [attr.aria-label]="ariaLabel(c)"
                            [attr.aria-current]="c.today ? 'date' : null"
                            (click)="dayOpen.emit(c.dateKey)"
                            [attr.data-testid]="'calendar-month-day-' + c.dateKey"
                        >
                            <span
                                class="absolute top-1 left-1.5 inline-flex items-center justify-center min-w-6 h-6 rounded-full text-[13.5px] font-bold tabular-nums"
                                [class]="c.today ? 'bg-primary text-primary-contrast' : ''"
                                >{{ c.dayNumber }}</span
                            >
                            @if (c.closed) {
                                <span class="absolute top-1.5 right-2 text-[11.5px] text-muted-color">kapalı</span>
                            } @else {
                                <span class="text-xl md:text-[26px] font-bold leading-none tabular-nums">{{ c.appointments }}</span>
                                <span class="hidden md:block text-[11.5px] text-muted-color mt-0.5">randevu</span>
                            }
                            <span class="hidden md:flex absolute left-2 right-2 bottom-1 items-center gap-1.5 text-[11.5px] text-muted-color">
                                @if (c.vaccines) {
                                    <span class="inline-flex items-center gap-1"><i class="pi pi-shield !text-[11px]" aria-hidden="true"></i>{{ c.vaccines }}</span>
                                }
                                @if (c.overdue) {
                                    <span class="ml-auto rounded-full bg-red-600 text-white px-1.5 text-[11px] font-bold">{{ c.overdue }} gecikmiş</span>
                                }
                            </span>
                            @if (c.overdue) {
                                <span class="md:hidden absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600" aria-hidden="true"></span>
                            }
                        </button>
                    }
                </div>
            }
        </div>
        <p class="m-0 mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-color" aria-hidden="true">
            az
            @for (l of legend; track l) {
                <span class="inline-block w-[18px] h-3 rounded-sm border border-surface-100 dark:border-surface-800" [style.background-color]="mix(l)"></span>
            }
            dolu
        </p>
    `,
    styles: `
        .calendar-closed {
            background-image: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--p-surface-400) 12%, transparent) 6px 8px);
        }
    `
})
export class AppointmentCalendarMonthComponent {
    readonly weeks = input.required<string[][]>();
    /** Gösterilen ay (yyyy-MM); dışındaki günler soluk. */
    readonly monthKey = input.required<string>();
    readonly today = input.required<string>();
    readonly appointmentSummary = input<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());
    readonly vaccineSummary = input<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());
    /** Gün başına kapasite (sözleşme §8.4); boşsa doluluk rengi ve kapalı gün gösterilmez. */
    readonly capacity = input<ReadonlyMap<string, number>>(new Map());

    readonly dayOpen = output<string>();

    protected readonly weekdays = WEEKDAYS;
    protected readonly legend = [0.1, 0.5, 1];

    protected readonly cells = computed<MonthCell[][]>(() =>
        this.weeks().map((week) =>
            week.map((dateKey) => {
                const a = this.appointmentSummary().get(dateKey);
                const v = this.vaccineSummary().get(dateKey);
                const cap = this.capacity().get(dateKey);
                const appointments = a?.total ?? 0;

                return {
                    dateKey,
                    dayNumber: Number(dateKey.slice(8)),
                    inMonth: dateKey.startsWith(this.monthKey()),
                    today: dateKey === this.today(),
                    appointments,
                    vaccines: v?.total ?? 0,
                    overdue: (a?.overdue ?? 0) + (v?.overdue ?? 0),
                    closed: cap === 0 && appointments === 0,
                    load: cap ? Math.min(1, appointments / cap) : cap === 0 && appointments ? 1 : null
                };
            })
        )
    );

    protected heat(c: MonthCell): string | null {
        return c.closed || c.load === null ? null : this.mix(c.load);
    }

    /** Doluluk rengi: ana rengin %4–34'ü (açık ve koyu temada aynı kural). */
    protected mix(load: number): string {
        return `color-mix(in srgb, var(--p-primary-color) ${Math.round(4 + load * 30)}%, transparent)`;
    }

    protected ariaLabel(c: MonthCell): string {
        if (c.closed) {
            return `${c.dayNumber}, kapalı` + (c.vaccines ? `, ${c.vaccines} aşı` : '');
        }

        const parts = [`${c.dayNumber}`, `${c.appointments} randevu`];

        if (c.vaccines) {
            parts.push(`${c.vaccines} aşı`);
        }

        if (c.overdue) {
            parts.push(`${c.overdue} gecikmiş`);
        }

        if (c.load !== null) {
            parts.push(`yüzde ${Math.round(c.load * 100)} dolu`);
        }

        return parts.join(', ');
    }
}

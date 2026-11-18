import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { CalendarBubbleDirective, type CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';
import { FillViewportDirective } from '@/app/features/appointments/components/fill-viewport.directive';
import { clockLabel, toBlockTimes } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import { appointmentBubble } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';
import { appointmentTone, type CalendarTone, type CareMark, initials, toneCardClass } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-tone.utils';

/** Hafta görünümünde bir gün: randevular (saat sırasıyla) ve aşı sayısı. */
export interface WeekDayColumn {
    dateKey: string;
    dayNumber: string;
    weekday: string;
    today: boolean;
    closed: boolean;
    items: AppointmentCalendarItemVm[];
    /** `null`: aşı katmanı istenmiyor. */
    vaccines: { total: number; overdue: number } | null;
}

type WeekRow = { kind: 'item'; item: AppointmentCalendarItemVm; minute: number } | { kind: 'now'; minute: number };

/**
 * Hafta görünümü (ux/takvim-yeniden-tasarim.md, seçenek 1, kullanıcı seçimi 2026-11-18): her gün bir sütun, randevular saat sırasıyla
 * küçük kart (saat ve tür üstte küçük, hasta adı büyük, hekim baş harfi sağda). Günün başında aşı sayısı ("13 aşı · 3 gecikmiş"); tıklanınca
 * o günün gün görünümü (aşılar orada saatiyle). Bugün sütununda şimdiki saat ayracı; kapalı gün taralı. Hekim sayısından etkilenmez.
 */
@Component({
    selector: 'app-appointment-calendar-week',
    standalone: true,
    imports: [CalendarBubbleDirective, FillViewportDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-7 grid-rows-[minmax(0,1fr)] rounded-border border border-surface bg-surface-0 dark:bg-surface-900 overflow-hidden" appFillViewport data-testid="calendar-week">
            @for (d of view(); track d.day.dateKey) {
                <section class="flex flex-col min-w-0 min-h-0 border-l border-surface-100 dark:border-surface-800 first:border-l-0" [class]="d.day.today ? 'bg-primary-50/60 dark:bg-primary-950/40' : d.day.closed ? 'calendar-closed' : ''">
                    <button
                        type="button"
                        class="flex items-baseline gap-1.5 px-2.5 pt-2 pb-1.5 whitespace-nowrap overflow-hidden text-left cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800"
                        (click)="dayOpen.emit(d.day.dateKey)"
                        [attr.data-testid]="'calendar-column-' + d.day.dateKey"
                    >
                        <span class="text-xl font-bold tabular-nums" [class.text-primary]="d.day.today">{{ d.day.dayNumber }}</span>
                        <span class="text-[13px] font-semibold text-muted-color truncate">{{ d.day.weekday }}</span>
                        <span class="ml-auto text-xs text-muted-color">{{ d.count }} rnd</span>
                    </button>
                    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 px-1.5 pb-2">
                        @if (d.day.vaccines; as v) {
                            <button
                                type="button"
                                class="shrink-0 flex items-center gap-1.5 whitespace-nowrap overflow-hidden rounded-md border border-dashed border-surface bg-surface-50 dark:bg-surface-800 px-2 py-1 text-[12.5px] text-left cursor-pointer hover:border-primary"
                                (click)="dayOpen.emit(d.day.dateKey)"
                                [attr.aria-label]="v.total + ' aşı' + (v.overdue ? ', ' + v.overdue + ' gecikmiş' : '') + ', günü aç'"
                                [attr.data-testid]="'calendar-week-vaccines-' + d.day.dateKey"
                            >
                                <i class="pi pi-shield !text-xs" aria-hidden="true"></i><b>{{ v.total }} aşı</b>
                                @if (v.overdue) {
                                    <span class="text-red-600 dark:text-red-400 font-bold">· {{ v.overdue }} gecikmiş</span>
                                }
                                <span class="ml-auto text-muted-color" aria-hidden="true">›</span>
                            </button>
                        }
                        @for (r of d.rows; track $index) {
                            @if (r.kind === 'now') {
                                <div class="shrink-0 flex items-center gap-1.5 text-primary text-[11px] font-bold tabular-nums" aria-hidden="true">{{ clock(r.minute) }}<span class="flex-1 h-0.5 bg-primary"></span></div>
                            } @else {
                                <button
                                    type="button"
                                    class="shrink-0 flex flex-col text-left rounded-md border border-l-[3px] px-2 py-1 cursor-pointer shadow-sm hover:shadow-md min-w-0"
                                    [class]="cardClass(r.item)"
                                    [appCalendarBubble]="bubble(r.item)"
                                    (click)="open.emit(r.item.id)"
                                    [attr.data-testid]="'calendar-block-' + r.item.id"
                                >
                                    <span class="flex gap-1 text-[11.5px] whitespace-nowrap overflow-hidden min-w-0" [class]="tone(r.item) === 'room' ? '' : 'text-muted-color'">
                                        <b class="font-semibold tabular-nums shrink-0" [class]="tone(r.item) === 'room' ? '' : 'text-color'">{{ clock(r.minute) }}</b>
                                        <span class="truncate min-w-0"
                                            >·
                                            @if (r.item.appointmentTypeLabel.startsWith('Aşı')) {
                                                <i class="pi pi-shield !text-[10px]" aria-hidden="true"></i>
                                            }
                                            {{ kind(r.item) }}{{ suffix(r.item) }}</span
                                        >
                                        <span class="ml-auto shrink-0 pl-1 text-[10.5px] font-bold">{{ vet(r.item) }}</span>
                                    </span>
                                    <span class="block truncate text-[13.5px] font-bold" [class.line-through]="tone(r.item) === 'off'"
                                        >{{ r.item.petName }} <span class="font-normal text-[12.5px]" [class]="tone(r.item) === 'room' ? 'opacity-85' : 'text-muted-color'">· {{ owner(r.item) }}</span></span
                                    >
                                </button>
                            }
                        }
                        @if (!d.day.items.length) {
                            <p class="m-0 px-1 py-1 text-xs text-muted-color">{{ d.day.closed ? 'Kapalı' : 'Randevu yok' }}</p>
                        }
                    </div>
                </section>
            }
        </div>
    `,
    styles: `
        .calendar-closed {
            background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--p-surface-400) 12%, transparent) 6px 8px);
        }
    `
})
export class AppointmentCalendarWeekComponent {
    readonly days = input.required<WeekDayColumn[]>();
    /** Bugünün İstanbul dakikası; bugün sütununda ayraç. */
    readonly nowMinute = input<number | null>(null);
    readonly care = input<ReadonlyMap<string, CareMark>>(new Map());
    readonly clinicName = input('');

    readonly open = output<string>();
    readonly dayOpen = output<string>();

    protected readonly view = computed(() =>
        this.days().map((day) => {
            const items = day.items
                .map((item) => ({ item, minute: toBlockTimes(item)?.start ?? 0 }))
                .sort((a, b) => a.minute - b.minute);
            const rows: WeekRow[] = [];
            const now = this.nowMinute();
            let nowPlaced = !day.today || now === null;

            for (const i of items) {
                if (!nowPlaced && i.minute > now!) {
                    rows.push({ kind: 'now', minute: now! });
                    nowPlaced = true;
                }

                rows.push({ kind: 'item', ...i });
            }

            return { day, rows, count: items.filter((i) => appointmentTone(i.item) !== 'off').length };
        })
    );

    protected clock(minute: number): string {
        return clockLabel(minute);
    }

    protected tone(item: AppointmentCalendarItemVm): CalendarTone {
        return appointmentTone(item, this.care().get(item.id));
    }

    protected cardClass(item: AppointmentCalendarItemVm): string {
        return toneCardClass(this.tone(item));
    }

    protected kind(item: AppointmentCalendarItemVm): string {
        return item.reasonName ?? item.appointmentTypeLabel;
    }

    protected suffix(item: AppointmentCalendarItemVm): string {
        switch (this.tone(item)) {
            case 'wait':
                return ' · bekliyor';
            case 'room':
                return ' · muayenede';
            case 'overdue':
                return ' · gecikmiş';
            default:
                return '';
        }
    }

    protected vet(item: AppointmentCalendarItemVm): string {
        return item.veterinarianUserId ? initials(item.veterinarianName) : '–';
    }

    /** Dar sütunda sahip kısa: "Ayşe Yılmaz" → "A. Yılmaz". */
    protected owner(item: AppointmentCalendarItemVm): string {
        const words = item.clientName.split(/\s+/).filter((w) => !!w);

        return words.length > 1 ? `${words[0][0]}. ${words.at(-1)}` : item.clientName;
    }

    protected bubble(item: AppointmentCalendarItemVm): CalendarBubbleData {
        return appointmentBubble(item, this.clinicName());
    }
}

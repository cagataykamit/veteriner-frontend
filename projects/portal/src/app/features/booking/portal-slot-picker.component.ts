import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { formatPortalDateParts, formatPortalTime, formatPortalWeekday, PortalDateParts } from '@portal/app/shared/format/portal-date';
import { PortalBookingDay, PortalBookingSlot } from './portal-booking.api';

/** Takvim günü (`yyyy-MM-dd`) → İstanbul öğle saati (09:00Z); aynı takvim gününe düşer. */
function calendarNoon(date: string): string {
    return `${date}T09:00:00Z`;
}

/** Takvim günü (`yyyy-MM-dd`) → gün adı. */
export function bookingDayWeekday(date: string): string {
    return formatPortalWeekday(calendarNoon(date));
}

/** Saat grubu: göz gezdirmeyi kolaylaştırır; sınırlar İstanbul saatiyle 12:00 ve 17:00. */
interface SlotGroup {
    readonly label: string;
    readonly slots: readonly PortalBookingSlot[];
}

const SLOT_GROUPS: readonly { readonly label: string; readonly untilHour: number }[] = [
    { label: 'Sabah', untilHour: 12 },
    { label: 'Öğleden sonra', untilHour: 17 },
    { label: 'Akşam', untilHour: 24 }
];

/**
 * Gün ve saat seçimi (ADR-042 K3): yalnız müsait saati olan günler takvim kutucuğu olarak yatay kaydırılır; seçili günün
 * saatleri sabah / öğleden sonra / akşam gruplarında ızgaradır. Saatler İstanbul saatiyle gösterilir, seçim `startUtc`
 * olarak yayımlanır.
 */
@Component({
    selector: 'portal-slot-picker',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .days {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            margin: 0 -1.25rem;
            padding: 0.125rem 1.25rem 0.375rem;
            scroll-snap-type: x proximity;
            scroll-padding-inline: 1.25rem;
            scrollbar-width: thin;
        }
        button {
            border: 1px solid var(--portal-border);
            border-radius: 0.75rem;
            background: var(--portal-surface);
            color: inherit;
            font: inherit;
            cursor: pointer;
        }
        .day {
            flex: 0 0 4.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.5rem 0.25rem;
            line-height: 1.2;
            scroll-snap-align: start;
        }
        .day-num {
            font-size: 1.375rem;
            font-weight: 700;
        }
        .day small {
            color: var(--portal-text-muted);
            font-size: 0.75rem;
        }
        .group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .group h3 {
            margin: 0;
            color: var(--portal-text-muted);
            font-size: 0.8125rem;
            font-weight: 600;
        }
        .times {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
            gap: 0.5rem;
        }
        .time {
            min-height: var(--portal-touch);
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }
        button:hover {
            border-color: var(--vetinity-teal);
        }
        button.is-active {
            border-color: #0b6f69;
            background: #0b6f69;
            color: #fff;
        }
        .day.is-active small {
            color: #e6fffb;
        }
    `,
    template: `
        @if (availableDays().length) {
            <div class="days" role="group" aria-label="Gün seçin">
                @for (day of availableDays(); track day.date) {
                    <button
                        type="button"
                        class="day"
                        [class.is-active]="activeDate() === day.date"
                        [attr.aria-pressed]="activeDate() === day.date"
                        [attr.aria-label]="weekday(day.date) + ', ' + parts(day.date).day + ' ' + parts(day.date).month + ', ' + day.slots.length + ' boş saat'"
                        (click)="activeDate.set(day.date)"
                    >
                        <small>{{ parts(day.date).weekday }}</small>
                        <span class="day-num">{{ parts(day.date).day }}</span>
                        <small>{{ parts(day.date).month }}</small>
                    </button>
                }
            </div>
            <div class="portal-stack" data-testid="slot-times">
                @for (group of groups(); track group.label) {
                    <div class="group" role="group" [attr.aria-label]="group.label + ' saatleri'">
                        <h3>{{ group.label }}</h3>
                        <div class="times">
                            @for (slot of group.slots; track slot.startUtc) {
                                <button
                                    type="button"
                                    class="time"
                                    [class.is-active]="selected() === slot.startUtc"
                                    [attr.aria-pressed]="selected() === slot.startUtc"
                                    (click)="selectedChange.emit(slot.startUtc)"
                                >
                                    {{ time(slot.startUtc) }}
                                </button>
                            }
                        </div>
                    </div>
                }
            </div>
            <p class="portal-field-hint"><i class="fa-solid fa-clock" aria-hidden="true"></i> Saatler klinik saatiyle (İstanbul) gösterilir.</p>
        } @else {
            <p class="portal-muted" data-testid="no-slots">Bu neden için yakın tarihte uygun saat yok. Başka bir neden seçebilir ya da kliniği arayabilirsiniz.</p>
        }
    `
})
export class PortalSlotPicker {
    readonly days = input.required<readonly PortalBookingDay[]>();
    readonly selected = input<string | null>(null);
    readonly selectedChange = output<string>();

    readonly availableDays = computed(() => this.days().filter((d) => d.slots.length > 0));

    /** Seçili gün: seçili saatin günü, yoksa ilk müsait gün; gün listesi değişince yeniden hesaplanır. */
    readonly activeDate = linkedSignal<string | null>(() => {
        const days = this.availableDays();
        const selected = this.selected();

        return days.find((d) => d.slots.some((s) => s.startUtc === selected))?.date ?? days[0]?.date ?? null;
    });

    readonly groups = computed<readonly SlotGroup[]>(() => {
        const slots = this.availableDays().find((d) => d.date === this.activeDate())?.slots ?? [];

        return SLOT_GROUPS.map((g, i) => ({ label: g.label, slots: slots.filter((s) => slotGroupIndex(s.startUtc) === i) })).filter((g) => g.slots.length > 0);
    });

    weekday(date: string): string {
        return bookingDayWeekday(date);
    }

    parts(date: string): PortalDateParts {
        return formatPortalDateParts(calendarNoon(date));
    }

    time(utc: string): string {
        return formatPortalTime(utc);
    }
}

/** Saatin grubu: İstanbul saatinin saat kısmı ("09:30" → 9) ilk sınırın altında kaldığı grup. */
function slotGroupIndex(utc: string): number {
    const hour = Number(formatPortalTime(utc).slice(0, 2));

    return SLOT_GROUPS.findIndex((g) => hour < g.untilHour);
}

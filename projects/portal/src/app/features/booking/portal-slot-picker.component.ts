import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { formatPortalCalendarDate, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PortalBookingDay } from './portal-booking.api';

/** Takvim günü (`yyyy-MM-dd`) → gün adı; İstanbul öğle saati (09:00Z) aynı takvim gününe düşer. */
export function bookingDayWeekday(date: string): string {
    return formatPortalWeekday(`${date}T09:00:00Z`);
}

/**
 * Gün ve saat seçimi (ADR-042 K3): yalnız müsait saati olan günler listelenir; saatler İstanbul saatiyle gösterilir.
 * Seçim `startUtc` olarak yayımlanır. Gün düğmeleri yatay kaydırılır, saatler ızgarada.
 */
@Component({
    selector: 'portal-slot-picker',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-slot-days {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.25rem;
        }
        .portal-slot-day,
        .portal-slot-time {
            min-height: var(--portal-touch, 44px);
            border: 1px solid var(--portal-border, #e2e8f0);
            border-radius: 0.625rem;
            background: var(--portal-surface, #fff);
            color: inherit;
            font: inherit;
            cursor: pointer;
        }
        .portal-slot-day {
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.375rem 0.75rem;
            min-width: 5.5rem;
        }
        .portal-slot-day small {
            color: var(--portal-text-muted, #64748b);
        }
        .portal-slot-times {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
            gap: 0.5rem;
        }
        .portal-slot-day.is-active,
        .portal-slot-time.is-active {
            border-color: var(--vetinity-teal, #14b8a6);
            background: #0b6f69;
            color: #fff;
        }
        .portal-slot-day.is-active small {
            color: #e6fffb;
        }
    `,
    template: `
        @if (availableDays().length) {
            <div class="portal-slot-days" role="group" aria-label="Gün seçin">
                @for (day of availableDays(); track day.date) {
                    <button
                        type="button"
                        class="portal-slot-day"
                        [class.is-active]="activeDate() === day.date"
                        [attr.aria-pressed]="activeDate() === day.date"
                        (click)="activeDate.set(day.date)"
                    >
                        <span>{{ weekday(day.date) }}</span>
                        <small>{{ calendarDate(day.date) }}</small>
                    </button>
                }
            </div>
            <div class="portal-slot-times" role="group" aria-label="Saat seçin" data-testid="slot-times">
                @for (slot of activeSlots(); track slot.startUtc) {
                    <button
                        type="button"
                        class="portal-slot-time"
                        [class.is-active]="selected() === slot.startUtc"
                        [attr.aria-pressed]="selected() === slot.startUtc"
                        (click)="selectedChange.emit(slot.startUtc)"
                    >
                        {{ time(slot.startUtc) }}
                    </button>
                }
            </div>
            <p class="portal-field-hint">Saatler klinik saatiyle (İstanbul) gösterilir.</p>
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

    readonly activeSlots = computed(() => this.availableDays().find((d) => d.date === this.activeDate())?.slots ?? []);

    weekday(date: string): string {
        return bookingDayWeekday(date);
    }

    calendarDate(date: string): string {
        return formatPortalCalendarDate(date);
    }

    time(utc: string): string {
        return formatPortalTime(utc);
    }
}

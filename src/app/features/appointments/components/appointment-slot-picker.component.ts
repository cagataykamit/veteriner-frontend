import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';

/** Boş saati olan gün: İstanbul takvim günü ve o günün boş başlangıç saatleri (HH:mm, sıralı). */
export interface SlotPickerDay {
    readonly date: string;
    readonly times: readonly string[];
}

export interface SlotPick {
    readonly date: string;
    readonly time: string;
}

/** Saat grupları; sınırlar İstanbul saatiyle 12:00 ve 17:00 (portaldaki talep formuyla aynı). */
const SLOT_GROUPS: readonly { readonly label: string; readonly untilHour: number }[] = [
    { label: 'Sabah', untilHour: 12 },
    { label: 'Öğleden sonra', untilHour: 17 },
    { label: 'Akşam', untilHour: 24 }
];

/**
 * Müsaitlik yanıtından seçiciye: hekim seçiliyse yalnız o hekimin boş olduğu saatler, değilse herhangi bir hekimin boş olduğu
 * saatler. Boş saati kalmayan gün düşer.
 */
export function toSlotPickerDays(days: readonly StaffAvailabilityDayVm[], veterinarianUserId: string | null): SlotPickerDay[] {
    return days
        .map((day) => ({
            date: day.date,
            times: day.slots.filter((s) => !veterinarianUserId || (s.freeVeterinarianUserIds ?? []).includes(veterinarianUserId)).map((s) => toIstanbulTimeInputValue(s.startUtc))
        }))
        .filter((day) => day.times.length > 0);
}

/** Saatleri sabah / öğleden sonra / akşam gruplarına ayırır; boş grup düşer. */
export function groupSlotTimes(times: readonly string[]): { label: string; times: string[] }[] {
    return SLOT_GROUPS.map((g, i) => ({
        label: g.label,
        times: times.filter((t) => SLOT_GROUPS.findIndex((x) => Number(t.slice(0, 2)) < x.untilHour) === i)
    })).filter((g) => g.times.length > 0);
}

const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'UTC' });
const LONG_DAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const noon = (ymd: string) => new Date(`${ymd}T12:00:00Z`);

/**
 * Yeni randevuda gün ve saat (O9): boş saati olan günler şerit, seçili günün boş saatleri gruplu düğmeler; tek dokunuşla tarih
 * ve saat dolar. Dolu saatler (seçili hekime göre) görünmez. Kural backend'in müsaitlik servisindedir; bu bileşen yalnız çizer.
 * Listede olmayan saat (ör. araya sıkıştırma, geriye dönük kayıt) formdaki saat listesinden seçilir.
 */
@Component({
    selector: 'app-appointment-slot-picker',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="flex flex-col gap-3 rounded-border border border-surface p-3" aria-labelledby="slot-picker-title" data-testid="appointment-slot-picker">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 id="slot-picker-title" class="m-0 text-sm font-semibold">Boş saatler</h3>
                <small class="text-muted-color">Dolu saatler gösterilmez; başka saat için "Randevu saati" listesini kullanın.</small>
            </div>
            @if (days().length === 0) {
                <p class="m-0 text-sm text-muted-color" data-testid="slot-picker-empty">Önümüzdeki günlerde boş saat yok. Saati listeden seçebilirsiniz.</p>
            } @else {
                <div class="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Gün seçin">
                    @for (day of days(); track day.date) {
                        @let active = day.date === date();
                        <button
                            type="button"
                            class="flex shrink-0 w-16 flex-col items-center rounded-border border px-1 py-1.5 leading-tight cursor-pointer disabled:cursor-default disabled:opacity-60"
                            [class]="active ? 'border-primary bg-primary text-primary-contrast' : 'border-surface bg-transparent hover:border-primary'"
                            [attr.aria-pressed]="active"
                            [attr.aria-label]="longDay(day.date) + ', ' + day.times.length + ' boş saat'"
                            [disabled]="disabled()"
                            (click)="dateChange.emit(day.date)"
                            data-testid="slot-day"
                        >
                            <span class="text-xs">{{ weekday(day.date) }}</span>
                            <span class="text-lg font-semibold tabular-nums">{{ dayOfMonth(day.date) }}</span>
                            <span class="text-xs">{{ month(day.date) }}</span>
                        </button>
                    }
                </div>
                @if (groups().length > 0) {
                    @for (group of groups(); track group.label) {
                        <div role="group" [attr.aria-label]="group.label + ' saatleri'">
                            <span class="block text-xs font-medium text-muted-color mb-1">{{ group.label }}</span>
                            <div class="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
                                @for (t of group.times; track t) {
                                    @let chosen = t === time();
                                    <button
                                        type="button"
                                        class="min-h-(--touch-target) rounded-border border font-semibold tabular-nums cursor-pointer disabled:cursor-default disabled:opacity-60"
                                        [class]="chosen ? 'border-primary bg-primary text-primary-contrast' : 'border-surface bg-transparent hover:border-primary'"
                                        [attr.aria-pressed]="chosen"
                                        [disabled]="disabled()"
                                        (click)="timePick.emit({ date: date(), time: t })"
                                        data-testid="slot-time"
                                    >
                                        {{ t }}
                                    </button>
                                }
                            </div>
                        </div>
                    }
                } @else {
                    <p class="m-0 text-sm text-muted-color" data-testid="slot-picker-day-full">Seçilen günde boş saat yok; şeritten başka bir gün seçin.</p>
                }
            }
        </section>
    `
})
export class AppointmentSlotPickerComponent {
    readonly days = input.required<readonly SlotPickerDay[]>();
    /** Formdaki tarih (yyyy-MM-dd). */
    readonly date = input('');
    /** Formdaki saat (HH:mm). */
    readonly time = input('');
    readonly disabled = input(false);

    readonly dateChange = output<string>();
    readonly timePick = output<SlotPick>();

    protected readonly groups = computed(() => groupSlotTimes(this.days().find((d) => d.date === this.date())?.times ?? []));

    protected weekday(ymd: string): string {
        return WEEKDAY.format(noon(ymd));
    }

    protected dayOfMonth(ymd: string): string {
        return String(Number(ymd.slice(8, 10)));
    }

    protected month(ymd: string): string {
        return MONTH.format(noon(ymd));
    }

    protected longDay(ymd: string): string {
        return LONG_DAY.format(noon(ymd));
    }
}

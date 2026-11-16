import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { CalendarBubbleDirective } from '@/app/features/appointments/components/calendar-bubble';
import { vaccinationBubble, vaccineChipClass, vaccineStateLabel } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';

export interface VaccinePick {
    item: VaccinationCalendarItemVm;
    event: Event;
}

/**
 * Günün aşıları (takvimin üst şeridi ve telefon ajandası): aşı simgeli çip, durum rengi; çok aşı varsa ilk `limit` tanesi ve "+N aşı".
 * Aşı randevu değildir; çip saat dilimine yerleşmez.
 */
@Component({
    selector: 'app-calendar-vaccine-strip',
    standalone: true,
    imports: [CalendarBubbleDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ul class="list-none m-0 p-0 flex flex-wrap gap-1" [attr.aria-label]="label()">
            @for (v of visible(); track v.key) {
                <li class="min-w-0 max-w-full" [class.w-full]="stacked()">
                    <button
                        type="button"
                        class="max-w-full inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs leading-4 font-medium cursor-pointer hover:shadow-sm"
                        [class]="chipClass(v) + (stacked() ? ' w-full' : '')"
                        [appCalendarBubble]="bubble(v)"
                        [attr.aria-label]="v.vaccineName + ', ' + v.petName + ', ' + stateLabel(v)"
                        (click)="pick.emit({ item: v, event: $event })"
                        [attr.data-testid]="'calendar-vaccine-' + v.key"
                    >
                        <i class="pi pi-shield !text-[10px] shrink-0" aria-hidden="true"></i>
                        <span class="truncate shrink-0 max-w-[60%]">{{ v.petName }}</span>
                        <span class="truncate opacity-80">· {{ v.vaccineName }}</span>
                    </button>
                </li>
            }
            @if (hidden() > 0) {
                <li>
                    <button type="button" class="rounded px-1.5 py-0.5 text-xs leading-4 font-medium text-primary cursor-pointer hover:underline" (click)="expanded.set(true)" data-testid="calendar-vaccine-more">+{{ hidden() }} aşı</button>
                </li>
            } @else if (expanded() && items().length > limit()) {
                <li>
                    <button type="button" class="rounded px-1.5 py-0.5 text-xs leading-4 font-medium text-primary cursor-pointer hover:underline" (click)="expanded.set(false)">Daha az</button>
                </li>
            }
        </ul>
    `
})
export class CalendarVaccineStripComponent {
    readonly items = input.required<VaccinationCalendarItemVm[]>();
    /** Kapalıyken gösterilen çip sayısı. */
    readonly limit = input(6);
    /** Dar hücrede (hafta görünümü) çipler alt alta, tam genişlik; hasta adı önce görünür. */
    readonly stacked = input(false);
    readonly clinicName = input('');
    readonly pick = output<VaccinePick>();

    protected readonly expanded = signal(false);
    protected readonly visible = computed(() => (this.expanded() ? this.items() : this.items().slice(0, this.limit())));
    protected readonly hidden = computed(() => this.items().length - this.visible().length);
    protected readonly label = computed(() => `${this.items().length} aşı`);

    protected chipClass(v: VaccinationCalendarItemVm): string {
        return vaccineChipClass(v.state);
    }

    protected stateLabel(v: VaccinationCalendarItemVm): string {
        return vaccineStateLabel(v.state);
    }

    protected bubble(v: VaccinationCalendarItemVm) {
        return vaccinationBubble(v, this.clinicName());
    }
}

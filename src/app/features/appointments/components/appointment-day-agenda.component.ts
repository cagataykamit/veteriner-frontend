import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { parseAppointmentStatusRawToEnum, appointmentStatusEnumLabel } from '@/app/entities/appointment/utils/appointment-status.utils';
import { clockLabel, type Gap, toBlockTimes, type WorkingDay } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { CalendarBubbleDirective, type CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';
import { CalendarVaccineStripComponent, type VaccinePick } from '@/app/features/appointments/components/calendar-vaccine-strip.component';
import { appointmentBubble } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';

export interface AgendaDay {
    dateKey: string;
    weekday: string;
    dayNumber: string;
    /** "3 rnd", "boş", "kapalı". */
    note: string;
}

interface AgendaRow {
    kind: 'appt' | 'gap' | 'now' | 'break';
    start: number;
    end: number;
    item?: AppointmentCalendarItemVm;
}

/**
 * Telefonda günün ajandası (B1): gün şeridi, saat sırasıyla randevular, "Şimdi" çizgisi, öğle arası ve boş aralıklar ("+ Randevu").
 * Boş aralıklar çağıranın hesabıdır (seçili hekimin ya da tüm hekimlerin aynı anda boş olduğu aralıklar). Aşı katmanı açıksa günün
 * aşıları listenin üstünde ayrı kutuda; randevu sayılmaz.
 */
@Component({
    selector: 'app-appointment-day-agenda',
    standalone: true,
    imports: [CalendarBubbleDirective, CalendarVaccineStripComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1" role="tablist" aria-label="Günler">
            @for (d of days(); track d.dateKey) {
                <button
                    type="button"
                    role="tab"
                    class="flex flex-col items-center min-w-12 rounded-border px-2 py-1 border cursor-pointer"
                    [class]="d.dateKey === selected() ? 'bg-primary text-primary-contrast border-primary' : 'border-surface bg-surface-0 dark:bg-surface-900'"
                    [attr.aria-selected]="d.dateKey === selected()"
                    (click)="dayChange.emit(d.dateKey)"
                >
                    <span class="text-xs">{{ d.weekday }}</span>
                    <span class="text-base font-semibold leading-5">{{ d.dayNumber }}</span>
                    <span class="text-[10px] leading-3" [class.text-muted-color]="d.dateKey !== selected()">{{ d.note }}</span>
                </button>
            }
        </div>
        @if (vaccines().length) {
            <section class="mt-2 rounded-border border border-surface bg-surface-50 dark:bg-surface-950 px-2 py-2" aria-label="Günün aşıları" data-testid="agenda-vaccines">
                <p class="m-0 mb-1 text-xs font-semibold text-muted-color">Aşılar · randevu değildir</p>
                <app-calendar-vaccine-strip [items]="vaccines()" [limit]="4" [clinicName]="clinicName()" (pick)="vaccinePick.emit($event)" />
            </section>
        }
        @if (rows().length === 0) {
            <p class="m-0 mt-2 text-sm text-muted-color">{{ working() ? 'Bu gün randevu yok.' : 'Klinik bu gün kapalı.' }}</p>
        }
        <ol class="list-none m-0 mt-2 p-0 flex flex-col gap-2" data-testid="day-agenda">
            @for (r of rows(); track r.kind + r.start + (r.item?.id ?? '')) {
                @switch (r.kind) {
                    @case ('now') {
                        <li class="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                            <span class="w-2 h-2 rounded-full bg-red-600" aria-hidden="true"></span>Şimdi {{ clock(r.start) }}<span class="flex-1 h-px bg-red-600/60" aria-hidden="true"></span>
                        </li>
                    }
                    @case ('break') {
                        <li class="text-xs text-muted-color text-center py-1">Öğle arası · {{ clock(r.start) }}–{{ clock(r.end) }}</li>
                    }
                    @case ('gap') {
                        <li>
                            @if (canCreate()) {
                                <button
                                    type="button"
                                    class="w-full flex items-center gap-2 rounded-border border border-dashed border-surface px-3 py-2 text-sm text-muted-color cursor-pointer"
                                    (click)="gapPick.emit(r.start)"
                                    data-testid="agenda-gap"
                                >
                                    <span class="tabular-nums">{{ clock(r.start) }}–{{ clock(r.end) }}</span
                                    ><span>{{ gapLabel() }}</span>
                                    <span class="ml-auto inline-flex items-center gap-1 text-primary font-medium"><i class="pi pi-plus !text-xs" aria-hidden="true"></i>Randevu</span>
                                </button>
                            } @else {
                                <div class="rounded-border border border-dashed border-surface px-3 py-2 text-sm text-muted-color">
                                    <span class="tabular-nums">{{ clock(r.start) }}–{{ clock(r.end) }}</span> {{ gapLabel() }}
                                </div>
                            }
                        </li>
                    }
                    @default {
                        <li>
                            <button
                                type="button"
                                class="w-full text-left rounded-border border border-surface border-l-4 px-3 py-2 cursor-pointer"
                                [class]="itemClass(r.item!)"
                                [appCalendarBubble]="bubble(r.item!)"
                                (click)="open.emit(r.item!.id)"
                                [attr.data-testid]="'agenda-item-' + r.item!.id"
                            >
                                <span class="flex items-center gap-1 text-xs font-semibold">
                                    <span class="tabular-nums" [class.line-through]="isCancelled(r.item!)">{{ clock(r.start) }}–{{ clock(r.end) }}</span>
                                    @if (conflicts().has(r.item!.id)) {
                                        <span class="inline-flex items-center gap-1 rounded px-1 bg-red-600 text-white text-[10px]"><i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>Çakışma</span>
                                    }
                                    @if (statusText(r.item!); as s) {
                                        <span class="rounded px-1 text-[10px] bg-surface-100 dark:bg-surface-800 text-muted-color">{{ s }}</span>
                                    }
                                </span>
                                <span class="block text-sm font-semibold truncate" [class.line-through]="isCancelled(r.item!)">
                                    {{ r.item!.petName }} <span class="font-normal text-muted-color">· {{ r.item!.clientName }}</span>
                                </span>
                                <span class="block text-xs text-muted-color truncate">{{ r.item!.appointmentTypeLabel }} · {{ r.item!.veterinarianName || 'Hekim seçilmedi' }}</span>
                            </button>
                        </li>
                    }
                }
            }
        </ol>
    `
})
export class AppointmentDayAgendaComponent {
    readonly days = input.required<AgendaDay[]>();
    readonly selected = input.required<string>();
    readonly items = input.required<AppointmentCalendarItemVm[]>();
    readonly working = input<WorkingDay | null>(null);
    readonly gaps = input<Gap[]>([]);
    /** Boş satır metni: tek hekim seçiliyse "boş", hepsinde "herkes boş". */
    readonly gapLabel = input('boş');
    readonly conflicts = input<ReadonlySet<string>>(new Set());
    readonly nowMinute = input<number | null>(null);
    readonly canCreate = input(false);
    /** Seçili günün aşıları (katman kapalıysa boş). */
    readonly vaccines = input<VaccinationCalendarItemVm[]>([]);
    readonly clinicName = input('');

    readonly dayChange = output<string>();
    readonly gapPick = output<number>();
    readonly open = output<string>();
    readonly vaccinePick = output<VaccinePick>();

    protected readonly rows = computed<AgendaRow[]>(() => {
        const rows: AgendaRow[] = [];

        for (const item of this.items()) {
            const t = toBlockTimes(item);

            if (t) {
                rows.push({ kind: 'appt', start: t.start, end: t.end, item });
            }
        }

        rows.push(...this.gaps().map((g) => ({ kind: 'gap' as const, start: g.start, end: g.end })));
        const w = this.working();

        if (rows.length && w?.breakStart != null && w.breakEnd != null) {
            rows.push({ kind: 'break', start: w.breakStart, end: w.breakEnd });
        }

        const now = this.nowMinute();

        if (rows.length && now !== null) {
            rows.push({ kind: 'now', start: now, end: now });
        }

        const order: Record<AgendaRow['kind'], number> = { now: 0, gap: 1, break: 1, appt: 2 };

        return rows.sort((a, b) => a.start - b.start || order[a.kind] - order[b.kind]);
    });

    protected clock(m: number): string {
        return clockLabel(m);
    }

    protected bubble(item: AppointmentCalendarItemVm): CalendarBubbleData {
        return appointmentBubble(item, this.clinicName());
    }

    protected isCancelled(item: AppointmentCalendarItemVm): boolean {
        return this.status(item) === 2;
    }

    protected statusText(item: AppointmentCalendarItemVm): string | null {
        const s = this.status(item);

        return s === null || s === 0 ? null : appointmentStatusEnumLabel(s);
    }

    protected itemClass(item: AppointmentCalendarItemVm): string {
        const s = this.status(item);
        const bar = s === 3 ? 'border-l-amber-500' : s === 1 || s === 2 ? 'border-l-surface-400' : 'border-l-primary';
        const faded = s !== null && s !== 0 ? ' opacity-60' : '';
        const ring = this.conflicts().has(item.id) ? ' !border-red-500 ring-1 ring-red-500' : '';

        return `bg-surface-0 dark:bg-surface-900 ${bar}${faded}${ring}`;
    }

    private status(item: AppointmentCalendarItemVm): number | null {
        return typeof item.status === 'number' ? item.status : parseAppointmentStatusRawToEnum(item.status);
    }
}

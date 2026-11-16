import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { appointmentStatusEnumLabel, parseAppointmentStatusRawToEnum } from '@/app/entities/appointment/utils/appointment-status.utils';
import { type CalendarBlock, clockLabel, isOpenAt, type WorkingDay } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { CalendarBubbleDirective, type CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';
import { CalendarVaccineStripComponent, type VaccinePick } from '@/app/features/appointments/components/calendar-vaccine-strip.component';
import { appointmentBubble } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';

/** Izgara sütunu: gün görünümünde bir hekim (ya da "Hekim seçilmedi"), hafta görünümünde bir gün. */
export interface CalendarGridColumn {
    key: string;
    dateKey: string;
    /** Boş hücreye tıklayınca forma gidecek hekim; hafta görünümünde o saatte boş ilk hekim çağıran tarafından seçilir. */
    veterinarianUserId: string | null;
    title: string;
    subtitle: string;
    /** Hafta görünümünde gün numarası. */
    dayNumber: string | null;
    today: boolean;
    working: WorkingDay | null;
    blocks: CalendarBlock[];
    conflictCount: number;
    /** Hafta görünümünde başlığa tıklayınca o güne geçilir. */
    opensDay: boolean;
}

/** Üst şerit hücresi: hafta görünümünde gün başına bir, gün görünümünde tüm sütunlara yayılan tek hücre. */
export interface CalendarAllDayCell {
    key: string;
    span: number;
    items: VaccinationCalendarItemVm[];
    /** Kapalıyken gösterilen çip sayısı. */
    limit: number;
    /** Dar hafta hücresinde çipler alt alta, tam genişlik. */
    stacked: boolean;
}

export interface CalendarSlotPick {
    column: CalendarGridColumn;
    minute: number;
}

const PX_PER_MIN = 1.6;
/** Hafta görünümünde hekim renkleri (sıra hekim listesindeki sıradır); hekimsiz randevu gri. */
const VET_TONES = ['teal', 'violet', 'orange', 'sky', 'rose', 'lime'] as const;

/**
 * Saat ızgarası (kullanıcı dostu denetim B1, taslak A): solda saat, her sütun bir hekim ya da gün; randevu süresi kadar uzun blok,
 * üst üste binenler yan yana; kapalı saat ve mola taralı; boş hücreye tıklayınca `slotPick`. Çakışan blok kırmızı çerçeveli.
 */
@Component({
    selector: 'app-appointment-calendar-grid',
    standalone: true,
    imports: [CalendarBubbleDirective, CalendarVaccineStripComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="overflow-x-auto rounded-border border border-surface" data-testid="calendar-grid">
            <div [style.min-width.px]="minWidth()">
                <div class="grid sticky top-0 z-20 bg-surface-0 dark:bg-surface-900 border-b border-surface" [style.grid-template-columns]="template()">
                    <div class="text-[11px] text-muted-color px-1 py-2 self-end">saat</div>
                    @for (c of columns(); track c.key) {
                        <button
                            type="button"
                            class="text-left px-3 py-2 border-l border-surface min-w-0"
                            [class]="c.today ? 'bg-primary-50 dark:bg-primary-950' : ''"
                            [class.cursor-pointer]="c.opensDay"
                            [disabled]="!c.opensDay"
                            (click)="dayOpen.emit(c.dateKey)"
                            [attr.data-testid]="'calendar-column-' + c.key"
                        >
                            <span class="flex items-center gap-2 min-w-0">
                                @if (c.dayNumber) {
                                    <span class="text-xl font-semibold leading-6" [class.text-primary]="c.today">{{ c.dayNumber }}</span>
                                }
                                <span class="font-semibold truncate">{{ c.title }}</span>
                                @if (c.today && c.dayNumber) {
                                    <span class="text-[10px] rounded bg-primary text-primary-contrast px-1">Bugün</span>
                                }
                                @if (c.conflictCount) {
                                    <span class="ml-auto shrink-0 inline-flex items-center gap-1 rounded bg-red-600 text-white text-[10px] px-1" [attr.aria-label]="c.conflictCount + ' çakışma'"
                                        ><i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>{{ c.conflictCount }}</span
                                    >
                                }
                            </span>
                            <span class="block text-xs text-muted-color truncate">{{ c.subtitle }}</span>
                        </button>
                    }
                </div>
                @if (allDay(); as cells) {
                    <!-- Aşı katmanı: günün üst şeridi; saat dilimine yerleşmez, hekim sütunlu görünümde tüm sütunlara yayılır. -->
                    <div class="grid border-b border-surface bg-surface-50 dark:bg-surface-950" [style.grid-template-columns]="template()" data-testid="calendar-all-day">
                        <div class="text-[11px] text-muted-color px-1 py-1.5" title="Aşılar randevu sayılmaz">aşı</div>
                        @for (cell of cells; track cell.key) {
                            <div class="border-l border-surface px-1.5 py-1 min-w-0" [style.grid-column]="'span ' + cell.span">
                                @if (cell.items.length) {
                                    <app-calendar-vaccine-strip [items]="cell.items" [limit]="cell.limit" [stacked]="cell.stacked" [clinicName]="clinicName()" (pick)="vaccinePick.emit($event)" />
                                }
                            </div>
                        }
                    </div>
                }
                <div class="grid" [style.grid-template-columns]="template()">
                    <div class="relative" [style.height.px]="height()">
                        @for (m of hourMarks(); track m) {
                            <div class="absolute right-1 text-[11px] text-muted-color tabular-nums -translate-y-1/2" [style.top.px]="y(m)">{{ clock(m) }}</div>
                        }
                    </div>
                    @for (c of columns(); track c.key) {
                        <div class="relative border-l border-surface" [style.height.px]="height()">
                            @for (m of rows(); track m) {
                                @if (canCreate() && isOpen(c, m)) {
                                    <button
                                        type="button"
                                        class="group absolute inset-x-0 border-t cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/60 text-left"
                                        [class]="m % 60 === 0 ? 'border-surface' : 'border-surface-100 dark:border-surface-800 border-dashed'"
                                        [style.top.px]="y(m)"
                                        [style.height.px]="rowPx()"
                                        [attr.aria-label]="'Yeni randevu ' + c.title + ' ' + clock(m)"
                                        (click)="slotPick.emit({ column: c, minute: m })"
                                    >
                                        <span class="hidden group-hover:inline-flex group-focus:inline-flex items-center gap-1 px-2 pt-0.5 text-xs text-primary font-medium"
                                            ><i class="pi pi-plus !text-[10px]" aria-hidden="true"></i>{{ clock(m) }}</span
                                        >
                                    </button>
                                } @else {
                                    <div class="absolute inset-x-0 border-t border-surface-100 dark:border-surface-800" [class.calendar-closed]="!isOpen(c, m)" [style.top.px]="y(m)" [style.height.px]="rowPx()"></div>
                                }
                            }
                            @if (!c.working) {
                                <div class="absolute inset-x-0 top-6 text-center text-sm text-muted-color">Kapalı</div>
                            }
                            @for (b of c.blocks; track b.item.id) {
                                <div class="absolute z-10 p-px" [style.top.px]="y(b.start)" [style.height.px]="(b.end - b.start) * pxPerMin" [style.left.%]="(b.lane / b.lanes) * 100" [style.width.%]="100 / b.lanes">
                                    <button
                                        type="button"
                                        class="w-full h-full text-left rounded-md border border-surface border-l-4 px-2 py-1 overflow-hidden cursor-pointer shadow-sm hover:shadow-md"
                                        [class]="blockClass(b)"
                                        [appCalendarBubble]="bubble(b)"
                                        [attr.aria-label]="hint(b)"
                                        (click)="open.emit(b.item.id)"
                                        [attr.data-testid]="'calendar-block-' + b.item.id"
                                    >
                                        <span class="flex items-center gap-1 text-xs leading-4 font-semibold min-w-0">
                                            <span class="tabular-nums shrink-0" [class.line-through]="cancelled(b)">{{ range(b) }}</span>
                                            @if (conflicts().has(b.item.id)) {
                                                <span class="inline-flex items-center gap-1 rounded px-1 bg-red-600 text-white text-[10px] leading-4 shrink-0"><i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>Çakışma</span>
                                            }
                                            @if (statusText(b); as s) {
                                                <span class="rounded px-1 text-[10px] leading-4 shrink-0 bg-surface-100 dark:bg-surface-800 text-muted-color">{{ s }}</span>
                                            }
                                        </span>
                                        <span class="block text-sm leading-5 font-semibold truncate" [class.line-through]="cancelled(b)">
                                            {{ b.item.petName }} <span class="font-normal text-muted-color">· {{ b.item.clientName }}</span>
                                        </span>
                                        @if (b.end - b.start >= 45 && b.lanes === 1) {
                                            <span class="block text-xs leading-4 text-muted-color truncate"
                                                >{{ b.item.appointmentTypeLabel }}
                                                @if (byVet() && b.item.veterinarianName) {
                                                    · {{ b.item.veterinarianName }}
                                                }
                                            </span>
                                        }
                                    </button>
                                </div>
                            }
                            @if (c.today && nowMinute() !== null && nowMinute()! >= start() && nowMinute()! < end()) {
                                <div class="absolute inset-x-0 z-10 h-0.5 bg-red-600 pointer-events-none" [style.top.px]="y(nowMinute()!)" aria-hidden="true">
                                    <span class="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-600"></span>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: `
        .calendar-closed {
            background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--p-surface-400) 18%, transparent) 6px 8px);
        }
    `
})
export class AppointmentCalendarGridComponent {
    readonly columns = input.required<CalendarGridColumn[]>();
    readonly start = input.required<number>();
    readonly end = input.required<number>();
    readonly rowMinutes = input(30);
    readonly conflicts = input<ReadonlySet<string>>(new Set());
    /** Hafta görünümü: bloklar hekim renginde (sıra `vetOrder`). */
    readonly byVet = input(false);
    readonly vetOrder = input<readonly string[]>([]);
    readonly canCreate = input(false);
    /** Bugünün İstanbul dakikası; bugünün sütununda kırmızı çizgi. */
    readonly nowMinute = input<number | null>(null);
    /** Gün görünümünde sütun en az bu genişlikte (hekim çoksa yatay kaydırma). */
    readonly minColumnPx = input(180);
    /** Aşı katmanı hücreleri (gün görünümünde tek hücre tüm sütunlara yayılır); `null` ise şerit çizilmez. */
    readonly allDay = input<CalendarAllDayCell[] | null>(null);
    /** Ayrıntı balonundaki klinik adı. */
    readonly clinicName = input('');

    readonly slotPick = output<CalendarSlotPick>();
    readonly open = output<string>();
    readonly dayOpen = output<string>();
    readonly vaccinePick = output<VaccinePick>();

    protected readonly pxPerMin = PX_PER_MIN;
    protected readonly height = computed(() => (this.end() - this.start()) * PX_PER_MIN);
    protected readonly rowPx = computed(() => this.rowMinutes() * PX_PER_MIN);
    protected readonly rows = computed(() => {
        const out: number[] = [];

        for (let m = this.start(); m < this.end(); m += this.rowMinutes()) {
            out.push(m);
        }

        return out;
    });
    protected readonly hourMarks = computed(() => this.rows().filter((m) => m % 60 === 0 && m > this.start()));
    protected readonly template = computed(() => `52px repeat(${this.columns().length}, minmax(${this.minColumnPx()}px, 1fr))`);
    protected readonly minWidth = computed(() => 52 + this.columns().length * this.minColumnPx());

    protected y(minute: number): number {
        return (minute - this.start()) * PX_PER_MIN;
    }

    protected clock(minute: number): string {
        return clockLabel(minute);
    }

    protected isOpen(c: CalendarGridColumn, minute: number): boolean {
        return isOpenAt(c.working, minute);
    }

    protected range(b: CalendarBlock): string {
        return `${clockLabel(b.start)}–${clockLabel(b.end)}`;
    }

    protected cancelled(b: CalendarBlock): boolean {
        return this.status(b) === 2;
    }

    /** Planlı randevuda etiket yok; diğer durumlar kısa etiketle. */
    protected statusText(b: CalendarBlock): string | null {
        const s = this.status(b);

        return s === null || s === 0 ? null : appointmentStatusEnumLabel(s);
    }

    protected hint(b: CalendarBlock): string {
        const parts = [this.range(b), `${b.item.petName} (${b.item.clientName})`, b.item.appointmentTypeLabel, b.item.veterinarianName || 'Hekim seçilmedi', b.item.statusLabel];

        return parts.filter((p) => !!p).join(' · ');
    }

    protected bubble(b: CalendarBlock): CalendarBubbleData {
        return appointmentBubble(b.item, this.clinicName());
    }

    protected blockClass(b: CalendarBlock): string {
        const s = this.status(b);
        const base = this.byVet() ? toneClass(this.vetOrder().indexOf(b.item.veterinarianUserId ?? '')) : `bg-surface-0 dark:bg-surface-900 ${statusBar(s)}`;
        const faded = s !== null && s !== 0 ? ' opacity-60' : '';
        const ring = this.conflicts().has(b.item.id) ? ' !border-red-500 ring-1 ring-red-500' : '';

        return base + faded + ring;
    }

    private status(b: CalendarBlock): number | null {
        return typeof b.item.status === 'number' ? b.item.status : parseAppointmentStatusRawToEnum(b.item.status);
    }
}

function statusBar(status: number | null): string {
    switch (status) {
        case 1:
        case 2:
            return 'border-l-surface-400';
        case 3:
            return 'border-l-amber-500';
        default:
            return 'border-l-primary';
    }
}

function toneClass(index: number): string {
    switch (index >= 0 ? VET_TONES[index % VET_TONES.length] : null) {
        case 'teal':
            return 'bg-teal-50 border-l-teal-500 dark:bg-teal-950';
        case 'violet':
            return 'bg-violet-50 border-l-violet-500 dark:bg-violet-950';
        case 'orange':
            return 'bg-orange-50 border-l-orange-500 dark:bg-orange-950';
        case 'sky':
            return 'bg-sky-50 border-l-sky-500 dark:bg-sky-950';
        case 'rose':
            return 'bg-rose-50 border-l-rose-500 dark:bg-rose-950';
        case 'lime':
            return 'bg-lime-50 border-l-lime-500 dark:bg-lime-950';
        default:
            return 'bg-surface-100 border-l-surface-400 dark:bg-surface-800';
    }
}

/** Hekim filtresi ve hafta görünümü lejantı aynı rengi kullanır. */
export function vetDotClass(index: number): string {
    switch (index >= 0 ? VET_TONES[index % VET_TONES.length] : null) {
        case 'teal':
            return 'bg-teal-500';
        case 'violet':
            return 'bg-violet-500';
        case 'orange':
            return 'bg-orange-500';
        case 'sky':
            return 'bg-sky-500';
        case 'rose':
            return 'bg-rose-500';
        case 'lime':
            return 'bg-lime-500';
        default:
            return 'bg-surface-400';
    }
}

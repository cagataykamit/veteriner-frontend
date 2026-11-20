import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { appointmentStatusLabel } from '@/app/entities/appointment/utils/appointment-status.utils';
import { CalendarBubbleDirective, type CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';
import type { VaccinePick } from '@/app/features/appointments/components/calendar-vaccine-strip.component';
import { type CalendarBlock, clockLabel, isOpenAt, type WorkingDay } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import { appointmentBubble, vaccinationBubble, waitingLabel } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';
import { appointmentTone, type CalendarTone, type CareMark, initials, toneCardClass, vaccineTone } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-tone.utils';
import { toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';

/** Gün panosunda hekim sütunu (ya da "Hekim seçilmedi" / hekimsiz klinikte "Randevular"). */
export interface DayBoardColumn {
    key: string;
    vetId: string | null;
    title: string;
    blocks: CalendarBlock[];
    /** İptal olmayan randevu sayısı ve henüz bitmemiş (planlı) olanlar. */
    count: number;
    left: number;
    conflictCount: number;
}

/** "Aşılar" sütununda saatiyle duran aşı (İstanbul dakikası). */
export interface DayBoardVaccine {
    item: VaccinationCalendarItemVm;
    minute: number;
}

/** "Aşılar" sütunu: saatli aşılar ve başlıkta açılan liste (saatsiz, mesai dışı, uygulanan). */
export interface DayBoardVaccines {
    timed: DayBoardVaccine[];
    untimed: VaccinationCalendarItemVm[];
    afterHours: VaccinationCalendarItemVm[];
    applied: VaccinationCalendarItemVm[];
    waiting: number;
}

export interface CalendarSlotPick {
    dateKey: string;
    vetId: string | null;
    minute: number;
}

type BoardColumn = { kind: 'vet'; col: DayBoardColumn } | { kind: 'vaccines' };

/** Saat başı 84 px (taslak 3, seçenek 1): 30 dakikalık kartta iki satır rahat sığar. */
const PX_PER_MIN = 84 / 60;
const VACCINE_ROW_PX = 32;
const COLUMN_MIN_PX = 220;
const NARROW_VACCINE_PX = 210;
/** Bu kadar ve daha çok hekim sütununda "Aşılar" soldan ilk ve dar (sağ uçta kalsa kaydırmadan görünmez). */
const MANY_COLUMNS = 4;

/**
 * Gün görünümü, klinik panosu (ux/takvim-yeniden-tasarim.md, kullanıcı seçimi 2026-11-18): solda saat, hekim başına sütun ve ayrı bir
 * "Aşılar" sütunu. Aşı randevu slotu doldurmaz: sütununda saatiyle tek satır durur; saatsiz, mesai dışı ve uygulanan aşılar sütun
 * başlığında sayıdır, tıklanınca açılır. Takvim günün tamamı boyunca uzar, dikeyde sayfa kayar (iç kaydırma yok); başlık üst çubuğun altında sabit kalır. Çok hekimde sütun en az 220 px, takvim yana kayar; saat sütunu sabit kalır.
 * Kart: saat küçük üstte, hasta adı büyük; durum sol şeritte (renk dili `calendar-tone.utils`).
 */
@Component({
    selector: 'app-appointment-calendar-grid',
    standalone: true,
    imports: [CalendarBubbleDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative overflow-clip rounded-border border border-surface bg-surface-0 dark:bg-surface-900" data-testid="calendar-grid">
            <!-- Başlık sayfa kayarken üst çubuğun altında kalır; yatay kaydırmayı gövdeden alır (yalnız yatayda kırpılır, aşı listesi aşağı açılabilsin). -->
            <div class="sticky top-16 z-30 bg-surface-0 dark:bg-surface-900 border-b border-surface [overflow-x:clip]" data-grid-head>
                <div class="grid" [style.min-width.px]="minWidth()" [style.grid-template-columns]="template()" [style.transform]="'translateX(' + -scrollX() + 'px)'">
                    <div class="relative z-40 bg-surface-0 dark:bg-surface-900" [style.transform]="'translateX(' + scrollX() + 'px)'"></div>
                    @for (c of boardColumns(); track $index) {
                        @if (c.kind === 'vaccines') {
                            <div class="relative flex items-center gap-2.5 px-3 py-2 border-l border-surface-100 dark:border-surface-800 min-w-0" data-testid="calendar-vaccine-column">
                                <span class="w-8 h-8 shrink-0 rounded-full grid place-items-center bg-amber-400 text-amber-950" aria-hidden="true"><i class="pi pi-shield !text-sm"></i></span>
                                <!-- Dar sütunda liste bağlantısı kesilmesin: başlık satırının sağında, sayılar alt satırda. -->
                                <span class="min-w-0 flex-1">
                                    <span class="flex items-baseline gap-2 min-w-0">
                                        <span class="font-semibold truncate">Aşılar</span>
                                        @if (listCount()) {
                                            <button
                                                type="button"
                                                class="ml-auto shrink-0 text-xs text-primary font-semibold cursor-pointer hover:underline whitespace-nowrap"
                                                [attr.aria-expanded]="listOpen()"
                                                (click)="listOpen.set(!listOpen())"
                                                data-testid="calendar-vaccine-list-toggle"
                                            >
                                                {{ listLabel() }} ▾
                                            </button>
                                        }
                                    </span>
                                    <span class="block text-xs text-muted-color truncate"
                                        ><b class="text-color font-semibold">{{ vaccines()!.waiting }}</b> bekliyor · {{ vaccines()!.applied.length }} uygulandı</span
                                    >
                                </span>
                                @if (listOpen()) {
                                    <div class="absolute left-2 right-2 top-full mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 shadow-lg p-2 flex flex-col gap-1" data-testid="calendar-vaccine-list">
                                        @for (g of listGroups(); track g.title) {
                                            <p class="m-0 mt-1 px-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-color">{{ g.title }} · {{ g.items.length }}</p>
                                            @for (v of g.items; track v.key) {
                                                <button
                                                    type="button"
                                                    class="text-left rounded-md border border-l-[3px] px-2 py-1 text-sm cursor-pointer truncate"
                                                    [class]="vaccineCard(v)"
                                                    [appCalendarBubble]="vaccineBubble(v)"
                                                    (click)="vaccinePick.emit({ item: v, event: $event })"
                                                >
                                                    @if (g.timed) {
                                                        <span class="tabular-nums text-xs font-semibold text-muted-color mr-1">{{ vaccineClock(v) }}</span>
                                                    }
                                                    <b>{{ v.petName }}</b> <span class="text-muted-color">· {{ v.vaccineName }}</span>
                                                </button>
                                            }
                                        }
                                    </div>
                                }
                            </div>
                        } @else {
                            <div class="flex items-center gap-2.5 px-3 py-2 border-l border-surface-100 dark:border-surface-800 min-w-0" [attr.data-testid]="'calendar-column-' + c.col.key">
                                <span class="w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-bold bg-primary text-primary-contrast" aria-hidden="true">{{ badge(c.col) }}</span>
                                <span class="min-w-0">
                                    <span class="flex items-center gap-2 font-semibold min-w-0"
                                        ><span class="truncate">{{ c.col.title }}</span>
                                        @if (c.col.conflictCount) {
                                            <span class="shrink-0 inline-flex items-center gap-1 rounded bg-red-600 text-white text-[10px] px-1" [attr.aria-label]="c.col.conflictCount + ' çakışma'"
                                                ><i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>{{ c.col.conflictCount }}</span
                                            >
                                        }
                                    </span>
                                    <span class="block text-xs text-muted-color truncate"><b class="text-color font-semibold">{{ c.col.count }}</b> randevu · {{ c.col.left }} kaldı</span>
                                </span>
                            </div>
                        }
                    }
                </div>
            </div>

            <div #scroller class="overflow-x-auto" (scroll)="scrollX.set(scroller.scrollLeft)">
                <div class="grid" [style.min-width.px]="minWidth()" [style.grid-template-columns]="template()" data-grid-body>
                    <div class="sticky left-0 z-20 bg-surface-0 dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800" [style.height.px]="height()">
                        <div class="relative h-full">
                            @for (m of hourMarks(); track m) {
                                <div class="absolute right-2 text-[11.5px] text-muted-color tabular-nums -translate-y-1/2 scroll-mt-32" [style.top.px]="y(m) + (m === start() ? 8 : 0)" [attr.data-minute]="m">{{ clock(m) }}</div>
                            }
                            @if (showNow()) {
                                <div class="absolute left-1 z-10 -translate-y-1/2 rounded-md bg-primary text-primary-contrast text-[11px] font-bold tabular-nums px-1.5 py-px" [style.top.px]="y(nowMinute()!)" data-testid="calendar-now">
                                    {{ clock(nowMinute()!) }}
                                </div>
                            }
                        </div>
                    </div>
                    @for (c of boardColumns(); track $index) {
                        <div class="relative border-l border-surface-100 dark:border-surface-800" [style.height.px]="height()">
                            @for (m of quarterLines(); track m) {
                                <div class="absolute inset-x-0 border-t" [class]="m % 60 === 0 ? 'border-surface-200 dark:border-surface-700' : 'border-dotted border-surface-100 dark:border-surface-800'" [style.top.px]="y(m)"></div>
                            }
                            @if (c.kind === 'vaccines') {
                                @for (v of vaccineRows(); track v.item.key) {
                                    <div class="absolute inset-x-0 z-10 px-1 py-0.5" [style.top.px]="v.top" [style.height.px]="vaccineRowPx">
                                        <button
                                            type="button"
                                            class="w-full h-full flex items-center gap-1.5 rounded-lg border border-l-[3px] px-2 text-left cursor-pointer shadow-sm hover:shadow-md whitespace-nowrap overflow-hidden"
                                            [class]="vaccineCard(v.item)"
                                            [appCalendarBubble]="vaccineBubble(v.item)"
                                            [attr.aria-label]="clock(v.minute) + ' ' + v.item.petName + ', ' + v.item.vaccineName"
                                            (click)="vaccinePick.emit({ item: v.item, event: $event })"
                                            [attr.data-testid]="'calendar-vaccine-' + v.item.key"
                                        >
                                            <span class="tabular-nums text-xs font-semibold text-muted-color shrink-0">{{ clock(v.minute) }}</span>
                                            <b class="text-[13.5px] truncate shrink-0 max-w-[55%]">{{ v.item.petName }}</b>
                                            <span class="text-[13px] text-muted-color truncate">· {{ v.item.vaccineName }}</span>
                                            @if (v.item.state === 'Overdue') {
                                                <span class="ml-auto shrink-0 rounded px-1 text-[10px] font-bold bg-red-600 text-white">!</span>
                                            }
                                        </button>
                                    </div>
                                }
                            } @else {
                                @for (m of rows(); track m) {
                                    @if (canCreate() && isOpen(m)) {
                                        <button
                                            type="button"
                                            class="group absolute inset-x-0 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/60 text-left"
                                            [style.top.px]="y(m)"
                                            [style.height.px]="rowPx()"
                                            [attr.aria-label]="'Yeni randevu ' + c.col.title + ' ' + clock(m)"
                                            (click)="slotPick.emit({ dateKey: dateKey(), vetId: c.col.vetId, minute: m })"
                                        >
                                            <span class="hidden group-hover:inline-flex group-focus:inline-flex items-center gap-1 px-2 pt-0.5 text-xs text-primary font-medium"
                                                ><i class="pi pi-plus !text-[10px]" aria-hidden="true"></i>{{ clock(m) }}</span
                                            >
                                        </button>
                                    } @else if (!isOpen(m)) {
                                        <div class="calendar-closed absolute inset-x-0" [style.top.px]="y(m)" [style.height.px]="rowPx()"></div>
                                    }
                                }
                                @for (b of c.col.blocks; track b.item.id) {
                                    <div class="absolute z-10 px-1 py-0.5" [style.top.px]="y(b.start)" [style.height.px]="(b.end - b.start) * pxPerMin" [style.left.%]="(b.lane / b.lanes) * 100" [style.width.%]="100 / b.lanes">
                                        <button
                                            type="button"
                                            class="w-full h-full flex flex-col gap-px text-left rounded-lg border border-l-[3px] px-2.5 py-1 overflow-hidden cursor-pointer shadow-sm hover:shadow-md"
                                            [class]="cardClass(b)"
                                            [appCalendarBubble]="bubble(b)"
                                            [attr.aria-label]="hint(b)"
                                            (click)="open.emit(b.item.id)"
                                            [attr.data-testid]="'calendar-block-' + b.item.id"
                                        >
                                            <span class="flex items-center gap-1.5 text-[11.5px] leading-4 whitespace-nowrap overflow-hidden min-w-0" [class]="tone(b) === 'room' ? '' : 'text-muted-color'">
                                                <b class="font-semibold tabular-nums shrink-0" [class]="tone(b) === 'room' ? '' : 'text-color'">{{ range(b) }}</b>
                                                @if (!tall(b)) {
                                                    <span class="truncate min-w-0"
                                                        >·
                                                        @if (isVaccination(b)) {
                                                            <i class="pi pi-shield !text-[10px]" aria-hidden="true"></i>
                                                        }
                                                        {{ kind(b) }}</span
                                                    >
                                                }
                                                @if (conflicts().has(b.item.id)) {
                                                    <span class="ml-auto shrink-0 inline-flex items-center gap-1 rounded px-1 bg-red-600 text-white text-[10px] leading-4"
                                                        ><i class="pi pi-exclamation-triangle !text-[10px]" aria-hidden="true"></i>Çakışma</span
                                                    >
                                                }
                                                @if (statusBadge(b); as s) {
                                                    <span class="shrink-0 rounded px-1 text-[10.5px] font-bold leading-4" [class]="s.cls + (conflicts().has(b.item.id) ? '' : ' ml-auto')">{{ s.text }}</span>
                                                }
                                            </span>
                                            <span class="block truncate text-[14.5px] leading-5 font-bold" [class.line-through]="tone(b) === 'off'"
                                                >{{ b.item.petName }} <span class="font-normal text-[13px]" [class]="tone(b) === 'room' ? 'opacity-85' : 'text-muted-color'">· {{ b.item.clientName }}</span></span
                                            >
                                            @if (tall(b)) {
                                                <span class="block truncate text-xs" [class]="tone(b) === 'room' ? 'opacity-85' : 'text-muted-color'">
                                                    @if (isVaccination(b)) {
                                                        <i class="pi pi-shield !text-[10px]" aria-hidden="true"></i>
                                                    }
                                                    {{ kind(b) }}
                                                </span>
                                            }
                                        </button>
                                    </div>
                                }
                            }
                            @if (showNow()) {
                                <div class="absolute inset-x-0 z-20 h-0.5 bg-primary pointer-events-none" [style.top.px]="y(nowMinute()!)" aria-hidden="true"></div>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: `
        .calendar-closed {
            background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--p-surface-400) 16%, transparent) 6px 8px);
        }
    `
})
export class AppointmentCalendarGridComponent {
    readonly dateKey = input.required<string>();
    readonly columns = input.required<DayBoardColumn[]>();
    /** `null`: aşı katmanı istenmiyor (filtre ya da yetki), "Aşılar" sütunu çizilmez. */
    readonly vaccines = input<DayBoardVaccines | null>(null);
    readonly start = input.required<number>();
    readonly end = input.required<number>();
    readonly working = input<WorkingDay | null>(null);
    readonly rowMinutes = input(30);
    readonly conflicts = input<ReadonlySet<string>>(new Set());
    readonly canCreate = input(false);
    /** Bugünün İstanbul dakikası (yalnız bugün gösterilirken); ana renkte şimdi çizgisi. */
    readonly nowMinute = input<number | null>(null);
    /** Kabul kuyruğu: randevu kimliği → bekliyor / muayenede. */
    readonly care = input<ReadonlyMap<string, CareMark>>(new Map());
    readonly clinicName = input('');
    /** Verilirse ızgara ilk çizimde bu saate kaydırılır (çalışma saati kısıtı kapalı klinikte 00–24 ızgarada 08:00). */
    readonly scrollToMinute = input<number | null>(null);

    readonly slotPick = output<CalendarSlotPick>();
    readonly open = output<string>();
    readonly vaccinePick = output<VaccinePick>();

    protected readonly pxPerMin = PX_PER_MIN;
    protected readonly vaccineRowPx = VACCINE_ROW_PX;
    protected readonly listOpen = signal(false);
    /** Gövdenin yatay kaydırması; sabit başlık aynı miktarda kayar. */
    protected readonly scrollX = signal(0);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private scrolledToMinute = false;

    private readonly vaccinesFirst = computed(() => this.columns().length >= MANY_COLUMNS);

    protected readonly boardColumns = computed<BoardColumn[]>(() => {
        const vets: BoardColumn[] = this.columns().map((col) => ({ kind: 'vet', col }));

        if (!this.vaccines()) {
            return vets;
        }

        return this.vaccinesFirst() ? [{ kind: 'vaccines' }, ...vets] : [...vets, { kind: 'vaccines' }];
    });

    protected readonly template = computed(
        () =>
            `56px ${this.boardColumns()
                .map((c) => (c.kind === 'vaccines' && this.vaccinesFirst() ? `${NARROW_VACCINE_PX}px` : `minmax(${COLUMN_MIN_PX}px, 1fr)`))
                .join(' ')}`
    );
    protected readonly minWidth = computed(() => 56 + this.boardColumns().length * COLUMN_MIN_PX);
    protected readonly height = computed(() => (this.end() - this.start()) * PX_PER_MIN + 8);
    protected readonly rowPx = computed(() => this.rowMinutes() * PX_PER_MIN);

    protected readonly rows = computed(() => steps(this.start(), this.end(), this.rowMinutes()));
    protected readonly quarterLines = computed(() => steps(this.start(), this.end(), 15));
    protected readonly hourMarks = computed(() => steps(this.start(), this.end() + 1, 60));
    protected readonly showNow = computed(() => {
        const now = this.nowMinute();

        return now !== null && now >= this.start() && now < this.end();
    });

    /** Saatli aşılar sütunda alt alta; aynı dakikadakiler bir satır aşağı itilir (randevu bloğu değildir, yer kaplıyor görünmez). */
    protected readonly vaccineRows = computed(() => {
        let last = -Infinity;

        return (this.vaccines()?.timed ?? []).map((v) => {
            const top = Math.max(this.y(v.minute), last + VACCINE_ROW_PX + 2);

            last = top;

            return { ...v, top };
        });
    });

    protected readonly listCount = computed(() => {
        const v = this.vaccines();

        return v ? v.untimed.length + v.afterHours.length + v.applied.length : 0;
    });

    protected readonly listLabel = computed(() => {
        const v = this.vaccines()!;
        const parts = [v.untimed.length ? `${v.untimed.length} saatsiz` : '', v.afterHours.length ? `${v.afterHours.length} mesai dışı` : ''].filter((p) => !!p);

        return parts.length ? parts.join(', ') : 'listele';
    });

    protected readonly listGroups = computed(() => {
        const v = this.vaccines();

        return v
            ? [
                  { title: 'Saatsiz', items: v.untimed, timed: false },
                  { title: 'Mesai dışı', items: v.afterHours, timed: true },
                  { title: 'Uygulandı', items: v.applied, timed: false }
              ].filter((g) => g.items.length > 0)
            : [];
    });

    constructor() {
        afterRenderEffect(() => {
            const minute = this.scrollToMinute();

            if (this.scrolledToMinute || minute === null || minute <= this.start()) {
                return;
            }

            this.scrolledToMinute = true;
            this.host.nativeElement.querySelector(`[data-minute="${minute}"]`)?.scrollIntoView({ block: 'start' });
        });
    }

    protected y(minute: number): number {
        return (minute - this.start()) * PX_PER_MIN;
    }

    protected clock(minute: number): string {
        return clockLabel(minute);
    }

    protected isOpen(minute: number): boolean {
        return isOpenAt(this.working(), minute);
    }

    protected badge(c: DayBoardColumn): string {
        return c.vetId ? initials(c.title) : '–';
    }

    protected tone(b: CalendarBlock): CalendarTone {
        return appointmentTone(b.item, this.care().get(b.item.id));
    }

    protected cardClass(b: CalendarBlock): string {
        return toneCardClass(this.tone(b)) + (this.conflicts().has(b.item.id) ? ' ring-1 ring-red-500 !border-red-500' : '');
    }

    protected vaccineCard(v: VaccinationCalendarItemVm): string {
        return toneCardClass(vaccineTone(v));
    }

    /** Kart iki satırdan uzunsa tür üçüncü satırda; kısa kartta saatin yanında. */
    protected tall(b: CalendarBlock): boolean {
        return (b.end - b.start) * PX_PER_MIN - 4 >= 58;
    }

    protected range(b: CalendarBlock): string {
        return `${clockLabel(b.start)} – ${clockLabel(b.end)}`;
    }

    protected kind(b: CalendarBlock): string {
        return b.item.reasonName ?? b.item.appointmentTypeLabel;
    }

    protected isVaccination(b: CalendarBlock): boolean {
        return b.item.appointmentTypeLabel.startsWith('Aşı');
    }

    protected statusBadge(b: CalendarBlock): { text: string; cls: string } | null {
        const care = this.care().get(b.item.id);

        switch (this.tone(b)) {
            case 'wait':
                return { text: care?.kind === 'wait' && care.since ? waitingLabel(care.since, Date.now(), ' · ') : 'Bekliyor', cls: 'bg-amber-500 text-amber-950' };
            case 'room':
                return { text: 'Muayenede', cls: 'bg-white/20' };
            case 'overdue':
                return { text: 'Gecikmiş', cls: 'bg-red-600 text-white' };
            case 'done':
                return { text: '✓', cls: 'text-green-600 dark:text-green-400' };
            case 'off':
                return { text: appointmentStatusLabel(b.item.status), cls: 'text-muted-color' };
            default:
                return null;
        }
    }

    protected hint(b: CalendarBlock): string {
        return [this.range(b), `${b.item.petName} (${b.item.clientName})`, this.kind(b), b.item.veterinarianName || 'Hekim seçilmedi', this.statusBadge(b)?.text ?? b.item.statusLabel]
            .filter((p) => !!p)
            .join(' · ');
    }

    protected bubble(b: CalendarBlock): CalendarBubbleData {
        return appointmentBubble(b.item, this.clinicName());
    }

    protected vaccineBubble(v: VaccinationCalendarItemVm): CalendarBubbleData {
        return vaccinationBubble(v, this.clinicName());
    }

    protected vaccineClock(v: VaccinationCalendarItemVm): string {
        return toIstanbulTimeInputValue(v.atUtc ?? '') || '—';
    }
}

function steps(from: number, to: number, step: number): number[] {
    const out: number[] = [];

    for (let m = from; m < to; m += step) {
        out.push(m);
    }

    return out;
}


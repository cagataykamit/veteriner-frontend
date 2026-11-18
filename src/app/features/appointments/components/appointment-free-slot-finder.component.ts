import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import type { AppointmentReasonVm, StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { addGregorianDaysToYmd, toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';
import { istanbulTodayYmd } from '@/app/features/appointments/utils/appointment-schedule-validation.utils';

const OPEN_KEY = 'vetinity.calendar.freeSlotOpen';

/** Kullanıcının açık/kapalı seçimi tarayıcıda kalır; kayıt yoksa açık başlar (kullanıcı kararı 2026-11-18). */
function readFinderOpen(): boolean {
    try {
        return localStorage.getItem(OPEN_KEY) !== 'false';
    } catch {
        return true;
    }
}

function writeFinderOpen(open: boolean): void {
    try {
        localStorage.setItem(OPEN_KEY, String(open));
    } catch {
        // Depolama kapalıysa seçim yalnız bu sayfada kalır.
    }
}

/** Boş saat önerisi: tarih (İstanbul), saat ve önerilen hekim. */
export interface FreeSlotPick {
    date: string;
    time: string;
    veterinarianUserId: string | null;
}

interface FreeSlotRow extends FreeSlotPick {
    key: string;
    dayLabel: string;
    vetName: string;
}

const MAX_ROWS = 6;
const DAYS = 7;

/**
 * "Boş saat bul" (B1, taslak C'den): neden (süreyi belirler) ve hekim seçilir, önümüzdeki 7 günün ilk boş saatleri listelenir.
 * Kural tek yer backend'in müsaitlik servisidir (`GET clinics/{id}/online-booking/availability`, çalışma saati, mola, hekim çakışması).
 * Seçilen satır `pick` ile formu açar.
 */
@Component({
    selector: 'app-appointment-free-slot-finder',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SelectModule, ButtonModule],
    template: `
        <section class="rounded-border border border-surface p-3 flex flex-col gap-3" aria-labelledby="free-slot-title" data-testid="free-slot-finder">
            <h3 id="free-slot-title" class="m-0 text-base font-semibold">
                <button type="button" class="w-full flex items-center gap-2 text-left cursor-pointer" [attr.aria-expanded]="open()" (click)="toggleOpen()" data-testid="free-slot-toggle">
                    <i class="pi pi-search text-primary" aria-hidden="true"></i>Boş saat bul
                    <i class="pi ml-auto !text-xs text-muted-color" [class]="open() ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
                </button>
            </h3>
            @if (open()) {
            @if (reasons().length > 0) {
                <div>
                    <label for="freeSlotReason" class="block text-xs text-muted-color mb-1">Randevu nedeni (süre)</label>
                    <p-select inputId="freeSlotReason" [options]="reasonOptions()" optionLabel="label" optionValue="value" [ngModel]="reasonId()" (ngModelChange)="reasonId.set($event)" class="w-full" />
                </div>
            }
            @if (vets().length > 1) {
                <div>
                    <span class="block text-xs text-muted-color mb-1">Hekim</span>
                    <div class="flex flex-wrap gap-1" role="group" aria-label="Hekim">
                        <button
                            type="button"
                            class="rounded-full border px-2 py-0.5 text-sm cursor-pointer"
                            [class]="vetFilter() === null ? 'border-primary text-primary font-semibold' : 'border-surface'"
                            [attr.aria-pressed]="vetFilter() === null"
                            (click)="vetFilter.set(null)"
                        >
                            Fark etmez
                        </button>
                        @for (v of vets(); track v.userId) {
                            <button
                                type="button"
                                class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm cursor-pointer"
                                [class]="vetFilter() === v.userId ? 'border-primary text-primary font-semibold' : 'border-surface'"
                                [attr.aria-pressed]="vetFilter() === v.userId"
                                (click)="vetFilter.set(v.userId)"
                            >
                                <span class="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>{{ v.name }}
                            </button>
                        }
                    </div>
                </div>
            }
            <div>
                <span class="block text-xs text-muted-color mb-1">İlk boş saatler</span>
                @if (loading()) {
                    <p class="m-0 text-sm text-muted-color">Yükleniyor…</p>
                } @else if (error(); as e) {
                    <p class="m-0 text-sm text-red-600 dark:text-red-400">{{ e }}</p>
                    <button pButton type="button" size="small" [text]="true" (click)="reload()">Tekrar dene</button>
                } @else if (rows().length === 0) {
                    <p class="m-0 text-sm text-muted-color">Önümüzdeki 7 günde boş saat yok.</p>
                } @else {
                    <ul class="list-none m-0 p-0 flex flex-col gap-1">
                        @for (r of rows(); track r.key) {
                            <li>
                                <button
                                    type="button"
                                    class="w-full flex items-center gap-2 rounded-border border border-surface hover:border-primary hover:bg-primary-50 dark:hover:bg-primary-950 px-2 py-1.5 text-sm cursor-pointer text-left disabled:cursor-default disabled:opacity-60"
                                    [disabled]="!canCreate()"
                                    (click)="pick.emit({ date: r.date, time: r.time, veterinarianUserId: r.veterinarianUserId })"
                                    data-testid="free-slot-row"
                                >
                                    <span class="w-14 shrink-0 text-muted-color">{{ r.dayLabel }}</span>
                                    <span class="font-semibold tabular-nums">{{ r.time }}</span>
                                    <span class="truncate text-muted-color">{{ r.vetName }}</span>
                                    <i class="pi pi-angle-right ml-auto text-muted-color" aria-hidden="true"></i>
                                </button>
                            </li>
                        }
                    </ul>
                }
            </div>
            }
        </section>
    `
})
export class AppointmentFreeSlotFinderComponent {
    readonly clinicId = input.required<string>();
    readonly vets = input<VeterinarianVm[]>([]);
    readonly canCreate = input(false);
    /** Takvim yenilenince (randevu eklendi/iptal) liste de yenilenir. */
    readonly refreshKey = input(0);
    /** Takvimin sağ panelinde açık başlar; kullanıcı katlarsa seçim saklanır. */
    readonly open = signal(readFinderOpen());
    readonly pick = output<FreeSlotPick>();

    private readonly reasonsApi = inject(AppointmentReasonsService);
    private readonly bookingApi = inject(OnlineBookingService);

    protected readonly reasons = signal<AppointmentReasonVm[]>([]);
    protected readonly reasonId = signal<string | null>(null);
    protected readonly vetFilter = signal<string | null>(null);
    protected readonly days = signal<StaffAvailabilityDayVm[]>([]);
    protected readonly loading = signal(false);
    protected readonly error = signal<string | null>(null);

    protected readonly reasonOptions = computed(() => [{ value: null, label: 'Diğer (30 dk)' }, ...this.reasons().map((r) => ({ value: r.id as string | null, label: `${r.name} (${r.defaultDurationMinutes} dk)` }))]);

    protected readonly rows = computed<FreeSlotRow[]>(() => {
        const vetFilter = this.vetFilter();
        const names = new Map(this.vets().map((v) => [v.userId, v.name]));
        const today = istanbulTodayYmd();
        const tomorrow = addGregorianDaysToYmd(today, 1);
        const out: FreeSlotRow[] = [];

        for (const day of this.days()) {
            for (const slot of day.slots) {
                const free = slot.freeVeterinarianUserIds ?? [];
                const vet = vetFilter ?? free[0] ?? null;

                if (vetFilter && !free.includes(vetFilter)) {
                    continue;
                }

                out.push({
                    key: `${day.date}-${slot.startUtc}`,
                    date: day.date,
                    time: toIstanbulTimeInputValue(slot.startUtc),
                    veterinarianUserId: vet,
                    dayLabel: day.date === today ? 'Bugün' : day.date === tomorrow ? 'Yarın' : weekdayShort(day.date),
                    vetName: vet ? (names.get(vet) ?? '') : ''
                });

                if (out.length >= MAX_ROWS) {
                    return out;
                }
            }
        }

        return out;
    });

    constructor() {
        effect(() => {
            const clinicId = this.clinicId();

            untracked(() => this.reasonsApi.list(clinicId).subscribe({ next: (r) => this.reasons.set(r.filter((x) => x.isActive)), error: () => this.reasons.set([]) }));
        });
        effect(() => {
            this.clinicId();
            this.reasonId();
            this.refreshKey();
            untracked(() => this.reload());
        });
    }

    protected toggleOpen(): void {
        this.open.set(!this.open());
        writeFinderOpen(this.open());
    }

    protected reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.bookingApi.availability(this.clinicId(), this.reasonId(), istanbulTodayYmd(), DAYS).subscribe({
            next: (d) => {
                this.days.set(d);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.days.set([]);
                this.error.set(e instanceof Error ? e.message : 'Boş saatler yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

}

const WEEKDAY_SHORT = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' });

function weekdayShort(ymd: string): string {
    return WEEKDAY_SHORT.format(new Date(`${ymd}T12:00:00Z`));
}

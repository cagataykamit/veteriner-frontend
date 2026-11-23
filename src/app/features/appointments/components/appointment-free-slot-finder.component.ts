import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import type { AppointmentReasonVm, StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { appointmentRequestDayLabel } from '@/app/entities/online-booking/utils/appointment-request-time.utils';
import { toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';
import { istanbulTodayYmd } from '@/app/features/appointments/utils/appointment-schedule-validation.utils';
import { readSectionOpen, writeSectionOpen } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';

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
 * "Boş saat bul" (B1, taslak C'den): neden (süreyi belirler) ve hekim seçilir, takvimde açık günden (geçmişse bugünden)
 * itibaren 7 günün ilk boş saatleri listelenir; satır etiketi gerçek bugüne göredir ("Bugün", "Yarın", kısa tarih).
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
                @if (closable()) {
                    <!-- Takvimin üstüne açılan panelde başlık kapatır; içerik hep açık. -->
                    <span class="flex items-center gap-2">
                        <i class="pi pi-search text-primary" aria-hidden="true"></i>Boş saat bul
                        <button
                            type="button"
                            class="ml-auto grid place-items-center w-8 h-8 rounded-md text-muted-color hover:text-color hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer"
                            aria-label="Boş saat bul panelini kapat"
                            (click)="closed.emit()"
                            data-testid="free-slot-close"
                        >
                            <i class="pi pi-times !text-xs" aria-hidden="true"></i>
                        </button>
                    </span>
                } @else {
                    <button type="button" class="w-full flex items-center gap-2 text-left cursor-pointer" [attr.aria-expanded]="open()" (click)="toggleOpen()" data-testid="free-slot-toggle">
                        <i class="pi pi-search text-primary" aria-hidden="true"></i>Boş saat bul
                        <i class="pi ml-auto !text-xs text-muted-color" [class]="open() ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
                    </button>
                }
            </h3>
            @if (expanded()) {
            @if (reasons().length > 0) {
                <div>
                    <label for="freeSlotReason" class="block text-xs text-muted-color mb-1">Randevu nedeni (süre)</label>
                    <p-select inputId="freeSlotReason" [options]="reasonOptions()" optionLabel="label" optionValue="value" [ngModel]="reasonId()" (ngModelChange)="reasonId.set($event)" class="w-full" />
                </div>
            }
            @if (vets().length > 1) {
                <!-- Hekim adı takvimde sütun başlığında yazar; burada çip sırası yerine açılır liste (R-02). -->
                <div>
                    <label for="freeSlotVet" class="block text-xs text-muted-color mb-1">Hekim</label>
                    <p-select inputId="freeSlotVet" [options]="vetOptions()" optionLabel="label" optionValue="value" [ngModel]="vetFilter()" (ngModelChange)="vetFilter.set($event)" class="w-full" data-testid="free-slot-vet" />
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
                    <p class="m-0 text-sm text-muted-color">{{ fromToday() ? 'Önümüzdeki 7 günde boş saat yok.' : 'Açık günden itibaren 7 günde boş saat yok.' }}</p>
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
                                    <span class="w-20 shrink-0 whitespace-nowrap text-muted-color" data-testid="free-slot-day">{{ r.dayLabel }}</span>
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
    /** Takvimde açık gün (yyyy-MM-dd); arama bu günden başlar, geçmiş gün ya da boşsa bugünden. */
    readonly date = input<string | null>(null);
    /** Takvimin sağ panelinde açık başlar; kullanıcı katlarsa seçim saklanır. */
    readonly open = signal(readSectionOpen('freeSlot'));
    /** Takvimin üstüne açılan panelde (1440 px altı): başlıkta kapat düğmesi, içerik katlanmaz. */
    readonly closable = input(false);
    readonly pick = output<FreeSlotPick>();
    readonly closed = output<void>();
    protected readonly expanded = computed(() => this.closable() || this.open());

    private readonly reasonsApi = inject(AppointmentReasonsService);
    private readonly bookingApi = inject(OnlineBookingService);

    protected readonly reasons = signal<AppointmentReasonVm[]>([]);
    protected readonly reasonId = signal<string | null>(null);
    protected readonly vetFilter = signal<string | null>(null);
    protected readonly days = signal<StaffAvailabilityDayVm[]>([]);
    protected readonly loading = signal(false);
    protected readonly error = signal<string | null>(null);

    protected readonly vetOptions = computed(() => [{ value: null as string | null, label: 'Fark etmez' }, ...this.vets().map((v) => ({ value: v.userId as string | null, label: v.name }))]);
    protected readonly reasonOptions = computed(() => [{ value: null, label: 'Diğer (30 dk)' }, ...this.reasons().map((r) => ({ value: r.id as string | null, label: `${r.name} (${r.defaultDurationMinutes} dk)` }))]);

    /** Son arama bugünden mi başladı (boş liste metni için). */
    protected readonly fromToday = signal(true);

    protected readonly rows = computed<FreeSlotRow[]>(() => {
        const vetFilter = this.vetFilter();
        const names = new Map(this.vets().map((v) => [v.userId, v.name]));
        const now = new Date();
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
                    dayLabel: appointmentRequestDayLabel(slot.startUtc, now),
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
            this.date();
            untracked(() => this.reload());
        });
    }

    protected toggleOpen(): void {
        this.open.set(!this.open());
        writeSectionOpen('freeSlot', this.open());
    }

    protected reload(): void {
        const today = istanbulTodayYmd();
        const date = this.date();
        // Açık gün geçmişteyse geçmiş saat önerilmez; arama bugünden başlar.
        const from = date && date > today ? date : today;

        this.loading.set(true);
        this.error.set(null);
        this.fromToday.set(from === today);
        this.bookingApi.availability(this.clinicId(), this.reasonId(), from, DAYS).subscribe({
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

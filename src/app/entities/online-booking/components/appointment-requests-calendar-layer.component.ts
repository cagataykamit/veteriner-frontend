import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { formatDateDisplay, formatTimeDisplay } from '@/app/shared/utils/date.utils';

/** Takvim katmanı tercihi (kullanıcıya özel, tarayıcıda). */
export const CALENDAR_REQUEST_LAYER_STORAGE_KEY = 'vetinity.calendar.showRequests';

/**
 * Takvimde bekleyen talepler (APPT-016; ADR-042 K7): görünen aralıktaki bekleyen talepler kesik çerçeveli "Talep" kartlarıyla,
 * randevulardan ayrı gösterilir; filtreyle gizlenir. Tıklanınca kuyruktaki talep açılır. Bekleyen talep saati doldurmaz.
 */
@Component({
    selector: 'app-appointment-requests-calendar-layer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule],
    template: `
        <section class="mb-4" aria-label="Bekleyen randevu talepleri" data-testid="calendar-request-layer">
            <div class="flex flex-wrap items-center gap-2">
                <button pButton type="button" size="small" [severity]="visible() ? undefined : 'secondary'" [outlined]="!visible()" (click)="toggle()" [attr.aria-pressed]="visible()">
                    <i class="pi" [class.pi-eye]="visible()" [class.pi-eye-slash]="!visible()"></i>Bekleyen talepler ({{ items().length }})
                </button>
                @if (visible() && items().length > 0) {
                    <span class="text-xs text-muted-color">Talep kesin randevu değildir; saati doldurmaz.</span>
                }
            </div>
            @if (visible() && items().length > 0) {
                <ul class="list-none p-0 m-0 mt-2 flex flex-wrap gap-2">
                    @for (r of items(); track r.id) {
                        <li>
                            <button
                                type="button"
                                class="text-left bg-transparent cursor-pointer rounded-md border-2 border-dashed border-amber-500 px-2 py-1 text-sm hover:bg-amber-50 dark:hover:bg-amber-950"
                                (click)="open(r.id)"
                                data-testid="calendar-request-item"
                            >
                                <span class="font-semibold text-amber-700 dark:text-amber-300">Talep</span>
                                · {{ day(r.requestedStartUtc) }} {{ time(r.requestedStartUtc) }} · {{ r.reasonName }} · {{ r.petName ?? r.contactName }}
                            </button>
                        </li>
                    }
                </ul>
            }
        </section>
    `
})
export class AppointmentRequestsCalendarLayerComponent {
    readonly fromUtc = input<string | null>(null);
    readonly toUtc = input<string | null>(null);

    private readonly service = inject(AppointmentRequestsService);
    private readonly router = inject(Router);

    readonly visible = signal(readPreference());
    readonly all = signal<AppointmentRequestListItemVm[]>([]);
    readonly items = computed(() => this.all());

    day = (utc: string) => formatDateDisplay(utc);
    time = (utc: string) => formatTimeDisplay(utc);

    private loadSeq = 0;

    constructor() {
        effect(() => {
            const from = this.fromUtc();
            const to = this.toUtc();

            if (from && to) {
                this.load(from, to);
            }
        });
    }

    toggle(): void {
        this.visible.update((v) => !v);

        try {
            localStorage.setItem(CALENDAR_REQUEST_LAYER_STORAGE_KEY, this.visible() ? '1' : '0');
        } catch {
            // tercih saklanamazsa yalnız bu oturumda geçerli
        }
    }

    open(id: string): void {
        void this.router.navigate([APPOINTMENT_REQUESTS_ROUTE], { queryParams: { requestId: id } });
    }

    private load(fromUtc: string, toUtc: string): void {
        const seq = ++this.loadSeq;

        this.service.list({ status: AppointmentRequestStatus.Pending, fromUtc, toUtc, page: 1, pageSize: 200 }).subscribe({
            next: (r) => seq === this.loadSeq && this.all.set(r.items),
            error: () => seq === this.loadSeq && this.all.set([])
        });
    }
}

function readPreference(): boolean {
    try {
        return localStorage.getItem(CALENDAR_REQUEST_LAYER_STORAGE_KEY) !== '0';
    } catch {
        return true;
    }
}

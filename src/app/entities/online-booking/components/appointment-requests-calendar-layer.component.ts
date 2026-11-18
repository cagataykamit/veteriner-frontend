import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { formatDateDisplay, formatTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Takvimde bekleyen talepler (APPT-016; ADR-042 K7): görünen aralıkta bekleyen talep varsa takvim çubuğunda küçük bir rozet; tıklanınca
 * kesik çerçeveli "Talep" kartları açılır. Talep yoksa hiçbir şey çizilmez (takvim üstünde yer kaplamaz). Talep saati doldurmaz; karta
 * tıklanınca kuyruktaki talep açılır.
 */
@Component({
    selector: 'app-appointment-requests-calendar-layer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'relative' },
    template: `
        @if (items().length > 0) {
            <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 text-xs font-semibold cursor-pointer"
                [attr.aria-expanded]="open()"
                (click)="open.set(!open())"
                data-testid="calendar-request-badge"
            >
                <i class="pi pi-inbox !text-[11px]" aria-hidden="true"></i>{{ items().length }} talep
            </button>
            @if (open()) {
                <section
                    class="absolute left-0 top-full mt-1 z-50 w-[22rem] max-h-80 overflow-y-auto rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 shadow-lg p-2 flex flex-col gap-1.5"
                    aria-label="Bekleyen randevu talepleri"
                    data-testid="calendar-request-layer"
                >
                    <p class="m-0 px-1 text-xs text-muted-color">Talep kesin randevu değildir; saati doldurmaz.</p>
                    @for (r of items(); track r.id) {
                        <button
                            type="button"
                            class="text-left bg-transparent cursor-pointer rounded-md border-2 border-dashed border-amber-500 px-2 py-1 text-sm hover:bg-amber-50 dark:hover:bg-amber-950"
                            (click)="openRequest(r.id)"
                            data-testid="calendar-request-item"
                        >
                            <span class="font-semibold text-amber-700 dark:text-amber-300">Talep</span>
                            · {{ day(r.requestedStartUtc) }} {{ time(r.requestedStartUtc) }} · {{ r.reasonName }} · {{ r.petName ?? r.contactName }}
                        </button>
                    }
                </section>
            }
        }
    `
})
export class AppointmentRequestsCalendarLayerComponent {
    readonly fromUtc = input<string | null>(null);
    readonly toUtc = input<string | null>(null);

    private readonly service = inject(AppointmentRequestsService);
    private readonly router = inject(Router);

    readonly open = signal(false);
    readonly items = signal<AppointmentRequestListItemVm[]>([]);

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

    openRequest(id: string): void {
        void this.router.navigate([APPOINTMENT_REQUESTS_ROUTE], { queryParams: { requestId: id } });
    }

    private load(fromUtc: string, toUtc: string): void {
        const seq = ++this.loadSeq;

        this.service.list({ status: AppointmentRequestStatus.Pending, fromUtc, toUtc, page: 1, pageSize: 200 }).subscribe({
            next: (r) => seq === this.loadSeq && this.items.set(r.items),
            error: () => seq === this.loadSeq && this.items.set([])
        });
    }
}

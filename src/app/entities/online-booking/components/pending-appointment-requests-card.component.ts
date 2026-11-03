import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Kartta gösterilen en fazla talep; fazlası "Tümünü gör" ile kuyrukta. */
export const PENDING_REQUESTS_CARD_LIMIT = 5;

/**
 * Bugün ekranının başındaki bekleyen online randevu talepleri (ADR-042 K4): talep gelince resepsiyon ilk burada görür.
 * İstenen saate göre sıralı (sunucu), "Aç" talep penceresini açar. Bekleyen yoksa ya da yetki yoksa çizilmez.
 * Sayfa her yenilendiğinde (`refreshTick`) yeniden yüklenir; bulduğu sayıyı menü sayacına bildirir, böylece sayaç ve yeni
 * talep uyarısı Bugün ekranı açıkken de güncel kalır.
 */
@Component({
    selector: 'app-pending-appointment-requests-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonModule],
    template: `
        @if (total() > 0) {
            <section class="card mb-4 border-l-4 border-amber-500" aria-labelledby="pendingRequestsTitle" data-testid="pending-requests-card">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 id="pendingRequestsTitle" class="text-lg font-semibold m-0">
                        <i class="pi pi-globe text-amber-600 dark:text-amber-400 mr-2" aria-hidden="true"></i>Bekleyen online randevu talepleri ({{ total() }})
                    </h2>
                    <a [routerLink]="requestsRoute" class="text-sm font-medium">Tümünü gör →</a>
                </div>
                <ul class="list-none m-0 p-0 flex flex-col divide-y divide-surface-200 dark:divide-surface-700">
                    @for (r of items(); track r.id) {
                        <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-2" data-testid="pending-request-row">
                            <span class="font-medium whitespace-nowrap">{{ fmt(r.requestedStartUtc) }}</span>
                            <span class="flex-1 min-w-48">
                                {{ r.contactName }} · {{ r.petName ?? 'Hayvan belirtilmedi' }}
                                <span class="block text-sm text-muted-color">{{ r.reasonName }} · {{ r.durationMinutes }} dk</span>
                            </span>
                            <a pButton size="small" [routerLink]="requestsRoute" [queryParams]="{ requestId: r.id }" data-testid="pending-request-open">Aç</a>
                        </li>
                    }
                </ul>
            </section>
        }
    `
})
export class PendingAppointmentRequestsCardComponent {
    /** Üst sayfanın yenileme sayacı; her değişimde liste yeniden yüklenir. */
    readonly refreshTick = input(0);

    private readonly auth = inject(AuthService);
    private readonly requests = inject(AppointmentRequestsService);
    private readonly badgeFeed = inject(MenuBadgeFeed);

    readonly requestsRoute = APPOINTMENT_REQUESTS_ROUTE;
    readonly items = signal<AppointmentRequestListItemVm[]>([]);
    readonly total = signal(0);
    readonly fmt = (utc: string) => formatDateTimeDisplay(utc);

    constructor() {
        if (!this.auth.hasOperationClaim(APPOINTMENT_REQUESTS_MANAGE_CLAIM)) {
            return;
        }

        inject(DestroyRef).onDestroy(() => this.badgeFeed.release('pendingAppointmentRequests'));
        effect(() => {
            this.refreshTick();
            untracked(() => this.load());
        });
    }

    private load(): void {
        this.requests.list({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: PENDING_REQUESTS_CARD_LIMIT }).subscribe({
            next: (page) => {
                this.items.set(page.items);
                this.total.set(page.totalCount);
                this.badgeFeed.report('pendingAppointmentRequests', page.totalCount);
            },
            // Kart yardımcıdır; okunamazsa Bugün ekranı etkilenmez, son liste kalır.
            error: () => undefined
        });
    }
}

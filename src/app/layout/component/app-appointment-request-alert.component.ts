import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

const TOAST_KEY = 'appointment-request-alert';
const TOAST_LIFE_MS = 20_000;
/** En yeni talebi bulmak için bakılan bekleyen talep sayısı (sunucu istenen saate göre sıralar). */
const LOOKUP_PAGE_SIZE = 20;

/** Bekleyen talepler arasında en son gönderilen (oluşturulma zamanı en büyük). */
export function newestRequest(items: readonly AppointmentRequestListItemVm[]): AppointmentRequestListItemVm | null {
    return items.reduce<AppointmentRequestListItemVm | null>((best, r) => (!best || r.createdAtUtc > best.createdAtUtc ? r : best), null);
}

/**
 * Panel açıkken yeni online randevu talebi gelince sağ altta uyarı (ADR-042 K5'e ek): menü sayacı (bekleyen talep sayısı)
 * önceki bilinen değerden artınca en yeni talep gösterilir, "Aç" talep penceresini açar. İlk yüklemede ve klinik
 * değişince uyarı çıkmaz (önceki değer bilinmiyor). Ayrı sorgu yalnız artışta atılır; sayaç zaten aralıklı yenilenir.
 */
@Component({
    selector: 'app-appointment-request-alert',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ToastModule, ButtonModule],
    providers: [MessageService],
    template: `
        <p-toast [key]="toastKey" position="bottom-right">
            <ng-template #message let-message>
                <div class="flex flex-col gap-2 w-full" data-testid="request-alert">
                    <span class="font-semibold"><i class="pi pi-globe mr-2" aria-hidden="true"></i>{{ message.summary }}</span>
                    <span class="text-sm">{{ message.detail }}</span>
                    <div>
                        <button pButton type="button" size="small" (click)="open(message.data?.requestId)">Aç</button>
                    </div>
                </div>
            </ng-template>
        </p-toast>
    `
})
export class AppAppointmentRequestAlertComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly requests = inject(AppointmentRequestsService);
    private readonly badges = inject(MenuBadgeService);
    private readonly messages = inject(MessageService);

    readonly toastKey = TOAST_KEY;
    private previous: number | null = null;

    constructor() {
        if (!this.auth.hasOperationClaim(APPOINTMENT_REQUESTS_MANAGE_CLAIM)) {
            return;
        }

        effect(() => {
            const current = this.badges.count('pendingAppointmentRequests');

            untracked(() => {
                if (this.previous !== null && current !== null && current > this.previous) {
                    this.announceNewest(current);
                }

                this.previous = current;
            });
        });
    }

    open(requestId: string | undefined): void {
        this.messages.clear(TOAST_KEY);
        void this.router.navigate([APPOINTMENT_REQUESTS_ROUTE], { queryParams: requestId ? { requestId } : {} });
    }

    private announceNewest(pendingCount: number): void {
        this.requests.list({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: LOOKUP_PAGE_SIZE }).subscribe({
            next: (page) => {
                const r = newestRequest(page.items);
                const who = r ? `${r.contactName} · ${r.petName ?? 'hayvan belirtilmedi'} · ${formatDateTimeDisplay(r.requestedStartUtc)}` : '';

                this.messages.add({
                    key: TOAST_KEY,
                    severity: 'info',
                    summary: 'Yeni online randevu talebi',
                    detail: who ? `${who} (${pendingCount} bekliyor)` : `${pendingCount} talep bekliyor`,
                    life: TOAST_LIFE_MS,
                    data: { requestId: r?.id }
                });
            },
            // Ayrıntı alınamazsa uyarı yine çıkar; sayaç ve zil zaten var.
            error: () =>
                this.messages.add({ key: TOAST_KEY, severity: 'info', summary: 'Yeni online randevu talebi', detail: `${pendingCount} talep bekliyor`, life: TOAST_LIFE_MS, data: {} })
        });
    }
}

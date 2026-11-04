import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, output, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { APPOINTMENT_REQUESTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { NotificationService } from '@/app/entities/notification/notification.service';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { toPendingRequestPreview } from '@/app/entities/online-booking/utils/pending-request-preview.utils';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';

export const REQUEST_ALERT_LIFE_MS = 20_000;
/** En yeni talebi bulmak için bakılan bekleyen talep sayısı (sunucu istenen saate göre sıralar). */
const LOOKUP_PAGE_SIZE = 20;

/** Balonda gösterilen talep: "Ayşe Yılmaz · Pamuk · yarın 17:30"; ayrıntı alınamazsa bekleyen sayısı. */
export interface RequestAlertVm {
    requestId: string | null;
    detail: string;
}

/** Bekleyen talepler arasında en son gönderilen (oluşturulma zamanı en büyük). */
export function newestRequest(items: readonly AppointmentRequestListItemVm[]): AppointmentRequestListItemVm | null {
    return items.reduce<AppointmentRequestListItemVm | null>((best, r) => (!best || r.createdAtUtc > best.createdAtUtc ? r : best), null);
}

/** "Ayşe Yılmaz · Pamuk · yarın 17:30" (bugün/yarın küçük harfle, sonrası "5 Kas Per 10:00"). */
export function requestAlertDetail(r: AppointmentRequestListItemVm, now: Date): string {
    const p = toPendingRequestPreview(r, now);
    const day = p.soon ? p.dayLabel.toLocaleLowerCase('tr-TR') : p.dayLabel;

    return `${p.contactName} · ${p.petLabel} · ${day} ${p.time}`;
}

/**
 * Panel açıkken yeni online randevu talebi gelince zilin altında küçük balon (ADR-042 K5'e ek, taslak C): menü sayacı
 * (bekleyen talep sayısı) önceki bilinen değerden artınca en yeni talep gösterilir; "İncele" talep penceresini açar,
 * "Bildirimler" zil panelini açar. 20 sn sonra kendiliğinden kapanır. İlk yüklemede ve klinik değişince uyarı çıkmaz
 * (önceki değer bilinmiyor). Ayrı sorgu yalnız artışta atılır; sayaç zaten aralıklı yenilenir.
 * Zil paneli açılınca balon kapanır; klinik ya da kullanıcı paneli açıkken gizlenir (.layout-topbar-request-alert, CSS).
 */
@Component({
    selector: 'app-appointment-request-alert',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (alert(); as a) {
            <div class="layout-topbar-request-alert" role="status" data-testid="request-alert">
                <div class="flex items-start gap-3">
                    <span class="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary inline-flex items-center justify-center shrink-0" aria-hidden="true"><i class="pi pi-calendar-plus text-sm"></i></span>
                    <div class="flex-1 min-w-0 leading-tight">
                        <span class="block text-sm font-semibold">Yeni online randevu talebi</span>
                        <span class="block text-xs text-muted-color mt-0.5">{{ a.detail }}</span>
                        <div class="flex items-center gap-3 mt-2 text-xs">
                            <button type="button" class="p-0 bg-transparent border-0 cursor-pointer font-medium text-primary" (click)="open(a.requestId)" data-testid="request-alert-open">İncele</button>
                            <button type="button" class="p-0 bg-transparent border-0 cursor-pointer text-muted-color hover:text-color" (click)="onShowNotifications()" data-testid="request-alert-notifications">
                                {{ notificationsLabel() }}
                            </button>
                        </div>
                    </div>
                    <button type="button" class="p-0 bg-transparent border-0 cursor-pointer text-muted-color hover:text-color" aria-label="Kapat" (click)="dismiss()"><i class="pi pi-times text-xs"></i></button>
                </div>
            </div>
        }
    `
})
export class AppAppointmentRequestAlertComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly requests = inject(AppointmentRequestsService);
    private readonly badges = inject(MenuBadgeService);
    private readonly notifications = inject(NotificationService);

    /** "Bildirimler" düğmesi: zil paneli açılsın. */
    readonly showNotifications = output<void>();

    readonly alert = signal<RequestAlertVm | null>(null);
    readonly notificationsLabel = computed(() => {
        const count = this.notifications.unreadCount();

        return count > 0 ? `Bildirimler (${count})` : 'Bildirimler';
    });

    private previous: number | null = null;
    private lifeTimer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this.lifeTimer));

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

    open(requestId: string | null): void {
        this.dismiss();
        void this.router.navigate([APPOINTMENT_REQUESTS_ROUTE], { queryParams: requestId ? { requestId } : {} });
    }

    onShowNotifications(): void {
        this.dismiss();
        this.showNotifications.emit();
    }

    dismiss(): void {
        clearTimeout(this.lifeTimer);
        this.alert.set(null);
    }

    private announceNewest(pendingCount: number): void {
        // Yeni talep bildirimi de oluşmuş olabilir: "Bildirimler (N)" ve zil rozeti güncel olsun.
        this.notifications.refreshUnreadCount().subscribe({ error: () => undefined });
        this.requests.list({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: LOOKUP_PAGE_SIZE }).subscribe({
            next: (page) => {
                const r = newestRequest(page.items);

                this.show({ requestId: r?.id ?? null, detail: r ? requestAlertDetail(r, new Date()) : `${pendingCount} talep bekliyor` });
            },
            // Ayrıntı alınamazsa uyarı yine çıkar; sayaç ve zil zaten var.
            error: () => this.show({ requestId: null, detail: `${pendingCount} talep bekliyor` })
        });
    }

    private show(alert: RequestAlertVm): void {
        clearTimeout(this.lifeTimer);
        this.alert.set(alert);
        this.lifeTimer = setTimeout(() => this.alert.set(null), REQUEST_ALERT_LIFE_MS);
    }
}

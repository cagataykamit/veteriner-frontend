import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { AppointmentRequestStatus, type AppointmentRequestListItemVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { toPendingRequestPreview } from '@/app/entities/online-booking/utils/pending-request-preview.utils';
import { readPendingRequestsView, writePendingRequestsView, type PendingRequestsView } from '@/app/entities/online-booking/utils/pending-requests-view-preference';

/** Bugün ekranında gösterilen en fazla talep; fazlası "Tümünü gör" ile kuyrukta. */
export const PENDING_REQUESTS_PREVIEW_LIMIT = 5;

/**
 * Bugün ekranının bekleyen online randevu talepleri (ADR-042 K4): talep gelince resepsiyon ilk burada görür.
 * Sayfa düzeyinde sağlanır (`providers`); çip ve kutucuk görünümü aynı listeyi okur. İstenen saate göre sıralı (sunucu).
 * Her `load` bulduğu sayıyı menü sayacına bildirir, böylece sayaç ve yeni talep uyarısı Bugün ekranı açıkken de güncel kalır.
 * Yetki yoksa sorgu atılmaz ve hiçbir şey çizilmez. Görünüm tercihi kullanıcı başına tarayıcıda saklanır.
 */
@Injectable()
export class PendingAppointmentRequestsState {
    private readonly auth = inject(AuthService);
    private readonly requests = inject(AppointmentRequestsService);
    private readonly badgeFeed = inject(MenuBadgeFeed);
    private readonly canManage = this.auth.hasOperationClaim(APPOINTMENT_REQUESTS_MANAGE_CLAIM);
    private readonly userId = this.auth.getUserId();

    readonly items = signal<AppointmentRequestListItemVm[]>([]);
    readonly total = signal(0);
    /** "12 dk önce" ve "yeni" hesabının saati; her yüklemede güncellenir. */
    readonly now = signal(new Date());
    readonly rows = computed(() => this.items().map((r) => toPendingRequestPreview(r, this.now())));
    readonly view = signal<PendingRequestsView>(readPendingRequestsView(this.userId));
    readonly hasPending = computed(() => this.total() > 0);
    /** Bugün ekranında açık talep penceresi; sayfadan ayrılmadan incelenir, onaylanır ya da reddedilir. */
    readonly openId = signal<string | null>(null);

    constructor() {
        if (this.canManage) {
            inject(DestroyRef).onDestroy(() => this.badgeFeed.release('pendingAppointmentRequests'));
        }
    }

    load(): void {
        if (!this.canManage) {
            return;
        }

        this.requests.list({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: PENDING_REQUESTS_PREVIEW_LIMIT }).subscribe({
            next: (page) => {
                this.now.set(new Date());
                this.items.set(page.items);
                this.total.set(page.totalCount);
                this.badgeFeed.report('pendingAppointmentRequests', page.totalCount);
            },
            // Yardımcı bilgi; okunamazsa Bugün ekranı etkilenmez, son liste kalır.
            error: () => undefined
        });
    }

    open(id: string): void {
        this.openId.set(id);
    }

    /** Pencere kapandı; talep onaylandı ya da reddedildiyse (`changed`) liste yeniden yüklenir. */
    close(changed: boolean): void {
        this.openId.set(null);

        if (changed) {
            this.load();
        }
    }

    setView(view: PendingRequestsView): void {
        this.view.set(view);
        writePendingRequestsView(this.userId, view);
    }
}

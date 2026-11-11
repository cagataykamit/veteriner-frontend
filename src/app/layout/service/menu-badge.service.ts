import { afterNextRender, DestroyRef, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, merge, Observable, Subscription, switchMap, throttleTime, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM, EDOCUMENTS_ISSUE_CLAIM, LAB_RESULTS_READ_CLAIM, OWNER_PORTAL_MANAGE_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import type { MenuBadgeKey } from '@/app/core/routing/panel-navigation';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { PortalInboxService } from '@/app/entities/owner-portal/services/owner-portal.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { countWaitingVisits } from '@/app/entities/visit/utils/visit-today.utils';

/** Sayaçlar bu aralıkla ve sayfa geçişlerinde yenilenir; iki yenileme arası en az `MIN_GAP_MS` geçer. */
const REFRESH_INTERVAL_MS = 60_000;
const MIN_GAP_MS = 15_000;
const MAX_BADGE_COUNT = 99;
const EMPTY_COUNTS: Readonly<Record<MenuBadgeKey, number | null>> = {
    waitingVisits: null,
    requestedLabResults: null,
    pendingAppointmentRequests: null,
    openPortalDataRequests: null,
    eDocumentReminders: null
};

/** Menü sayaç metni: 0 veya bilinmiyorsa `null` (gizli), 99'dan büyükse `99+`. */
export function menuBadgeLabel(count: number | null | undefined): string | null {
    if (!count || count <= 0) {
        return null;
    }

    return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

/**
 * Menü sayaçları: Bugün'de bekleyen hasta, lab'da sonuç bekleyen istem, bekleyen online randevu talebi ve açık portal veri talebi sayısı.
 * İzni olmayan kullanıcı için sorgu yapılmaz ve sayaç gösterilmez. Hata olursa son değer korunur.
 * Açık sayfa aynı veriyi `MenuBadgeFeed` ile bildiriyorsa o değer gösterilir ve sorgu atlanır.
 */
@Injectable({ providedIn: 'root' })
export class MenuBadgeService {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly visits = inject(VisitsService);
    private readonly labResults = inject(LabResultsService);
    private readonly appointmentRequests = inject(AppointmentRequestsService);
    private readonly portalInbox = inject(PortalInboxService);
    private readonly eDocuments = inject(EDocumentsService);
    private readonly feed = inject(MenuBadgeFeed);
    private readonly injector = inject(Injector);

    private readonly counts = signal<Readonly<Record<MenuBadgeKey, number | null>>>(EMPTY_COUNTS);
    private readonly inflight = new Map<MenuBadgeKey, Subscription>();
    private clinicId: string | null = null;

    constructor() {
        // Sayfanın bildirdiği sayı saklanır: sayfa kapanınca sayaç bir sonraki yenilemeye kadar boşalmaz.
        effect(() => {
            for (const key of Object.keys(EMPTY_COUNTS) as MenuBadgeKey[]) {
                const fed = this.feed.value(key);

                if (typeof fed === 'number') {
                    untracked(() => this.set(key, fed));
                }
            }
        });
    }

    /** Sayaç değeri; izin yoksa veya henüz yüklenmediyse `null`. */
    count(key: MenuBadgeKey): number | null {
        return this.feed.value(key) ?? this.counts()[key];
    }

    /**
     * Aralıklı ve sayfa geçişlerinde yenilemeyi başlatır; sekme gizliyken aralık tetiklemesi atlanır. Gezinme sürerken ilk
     * yenilemeyi onun bitişi yapar: hemen bir de zamanlayıcıyla başlasaydı 15 sn sonra aynı sorgular ikinci kez giderdi.
     * Geçişte sayaç yeni sayfa çizildikten sonra yenilenir; sayfa açılırken sayacı üstlenebilir (`MenuBadgeFeed.claim`), aynı
     * istek iki kez gitmez.
     */
    connect(destroyRef: DestroyRef): void {
        const rendered = () =>
            new Observable<void>((subscriber) => {
                const ref = afterNextRender(
                    () => {
                        subscriber.next();
                        subscriber.complete();
                    },
                    { injector: this.injector }
                );

                return () => ref.destroy();
            });

        merge(
            timer(this.router.currentNavigation() ? REFRESH_INTERVAL_MS : 0, REFRESH_INTERVAL_MS).pipe(filter(() => !document.hidden)),
            this.router.events.pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                switchMap(rendered)
            )
        )
            .pipe(throttleTime(MIN_GAP_MS, undefined, { leading: true, trailing: true }), takeUntilDestroyed(destroyRef))
            .subscribe(() => this.refresh());
        destroyRef.onDestroy(() => this.inflight.forEach((s) => s.unsubscribe()));
    }

    refresh(): void {
        const clinicId = this.auth.getClinicId()?.trim() || null;

        if (clinicId !== this.clinicId) {
            this.clinicId = clinicId;
            this.counts.set(EMPTY_COUNTS);
        }

        this.track(
            'waitingVisits',
            VISITS_READ_CLAIM,
            () => this.visits.getToday().pipe(map(countWaitingVisits))
        );
        this.track(
            'requestedLabResults',
            LAB_RESULTS_READ_CLAIM,
            () => this.labResults.getLabResults({ page: 1, pageSize: 1, status: 'Requested' }).pipe(map((page) => page.totalItems))
        );
        this.track(
            'pendingAppointmentRequests',
            APPOINTMENT_REQUESTS_MANAGE_CLAIM,
            () => this.appointmentRequests.list({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: 1 }).pipe(map((page) => page.totalCount))
        );
        this.track('openPortalDataRequests', OWNER_PORTAL_MANAGE_CLAIM, () => this.portalInbox.summary().pipe(map((s) => s.openDataRequestCount)));
        // Belgesi kesilmemiş ödenmiş ücret + kesilemeyen belge; yalnız belge kesebilenlere ve entegratör bağlıysa (ADR-036 AK-4 hatırlatma).
        this.track('eDocumentReminders', EDOCUMENTS_ISSUE_CLAIM, () =>
            this.eDocuments.reminders().pipe(map((r) => (r.connected ? r.undocumentedPaidCount + r.failedCount : 0)))
        );
    }

    private track(key: MenuBadgeKey, claim: string, load: () => Observable<number>): void {
        this.inflight.get(key)?.unsubscribe();

        const fed = this.feed.value(key);

        // Sayfa bildiriyorsa ya da üstlendiyse sorgu atlanır; değer saklanır ki sayfa kapanınca sayaç boşalmasın.
        if (fed !== undefined) {
            if (fed !== null) {
                this.set(key, fed);
            }

            return;
        }

        if (!this.auth.hasOperationClaim(claim)) {
            this.set(key, null);

            return;
        }

        this.inflight.set(
            key,
            load().subscribe({
                next: (count) => this.set(key, count),
                error: () => undefined
            })
        );
    }

    private set(key: MenuBadgeKey, count: number | null): void {
        this.counts.update((current) => ({ ...current, [key]: count }));
    }
}

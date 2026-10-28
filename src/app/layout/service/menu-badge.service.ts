import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, merge, Observable, Subscription, throttleTime, timer } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_READ_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import type { MenuBadgeKey } from '@/app/core/routing/panel-navigation';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { countWaitingVisits } from '@/app/entities/visit/utils/visit-today.utils';

/** Sayaçlar bu aralıkla ve sayfa geçişlerinde yenilenir; iki yenileme arası en az `MIN_GAP_MS` geçer. */
const REFRESH_INTERVAL_MS = 60_000;
const MIN_GAP_MS = 15_000;
const MAX_BADGE_COUNT = 99;

/** Menü sayaç metni: 0 veya bilinmiyorsa `null` (gizli), 99'dan büyükse `99+`. */
export function menuBadgeLabel(count: number | null | undefined): string | null {
    if (!count || count <= 0) {
        return null;
    }

    return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

/**
 * Menü sayaçları: Bugün'de bekleyen hasta ve lab'da sonuç bekleyen istem sayısı.
 * İzni olmayan kullanıcı için sorgu yapılmaz ve sayaç gösterilmez. Hata olursa son değer korunur.
 * Açık sayfa aynı veriyi `MenuBadgeFeed` ile bildiriyorsa o değer gösterilir ve sorgu atlanır.
 */
@Injectable({ providedIn: 'root' })
export class MenuBadgeService {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly visits = inject(VisitsService);
    private readonly labResults = inject(LabResultsService);
    private readonly feed = inject(MenuBadgeFeed);

    private readonly counts = signal<Readonly<Record<MenuBadgeKey, number | null>>>({ waitingVisits: null, requestedLabResults: null });
    private readonly inflight = new Map<MenuBadgeKey, Subscription>();
    private clinicId: string | null = null;

    /** Sayaç değeri; izin yoksa veya henüz yüklenmediyse `null`. */
    count(key: MenuBadgeKey): number | null {
        return this.feed.value(key) ?? this.counts()[key];
    }

    /** Aralıklı ve sayfa geçişlerinde yenilemeyi başlatır; sekme gizliyken aralık tetiklemesi atlanır. */
    connect(destroyRef: DestroyRef): void {
        merge(
            timer(0, REFRESH_INTERVAL_MS).pipe(filter(() => !document.hidden)),
            this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        )
            .pipe(throttleTime(MIN_GAP_MS, undefined, { leading: true, trailing: true }), takeUntilDestroyed(destroyRef))
            .subscribe(() => this.refresh());
        destroyRef.onDestroy(() => this.inflight.forEach((s) => s.unsubscribe()));
    }

    refresh(): void {
        const clinicId = this.auth.getClinicId()?.trim() || null;

        if (clinicId !== this.clinicId) {
            this.clinicId = clinicId;
            this.counts.set({ waitingVisits: null, requestedLabResults: null });
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
    }

    private track(key: MenuBadgeKey, claim: string, load: () => Observable<number>): void {
        this.inflight.get(key)?.unsubscribe();

        const fed = this.feed.value(key);

        // Sayfa bildiriyorsa sorgu atlanır; değer saklanır ki sayfa kapanınca sayaç boşalmasın.
        if (fed !== undefined) {
            this.set(key, fed);

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

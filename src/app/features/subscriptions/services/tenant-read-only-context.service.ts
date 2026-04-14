import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import type { SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';

/**
 * Panel genelinde `subscription-summary` ile gelen etkin salt okunur bilgisi.
 * Layout açılışında yüklenir; abonelik sayfası aynı özeti çekince `applySummary` ile senkronlanır.
 */
@Injectable({ providedIn: 'root' })
export class TenantReadOnlyContextService {
    private readonly subscriptions = inject(SubscriptionsService);

    private readonly summarySignal = signal<SubscriptionSummaryVm | null>(null);

    /** Tek panel oturumunda bir kez HTTP; layout + dashboard faz 1 aynı akışı paylaşır. */
    private panelSubscriptionSummary$: Observable<SubscriptionSummaryVm | null> | null = null;

    /** Son başarılı özet (yüklenmediyse null). */
    readonly summary = this.summarySignal.asReadonly();

    /** Backend özeti yüklendi ve kiracı yazma kilitli. */
    readonly isTenantReadOnly = computed(() => this.summarySignal()?.isReadOnly === true);

    /** Yazma UI’si (mutation) kapalı mı — `isTenantReadOnly` ile aynı anlam. */
    readonly mutationBlocked = this.isTenantReadOnly;

    /** Abonelik ekranına yönlendirilebilir owner/admin. */
    readonly canManageSubscription = computed(() => this.summarySignal()?.canManageSubscription === true);

    /**
     * Panel için subscription-summary (paylaşımlı).
     * Dashboard faz 1 ile aynı anda çağrılsa bile yalnızca bir GET gider.
     */
    ensurePanelSubscriptionSummary(): Observable<SubscriptionSummaryVm | null> {
        if (!this.panelSubscriptionSummary$) {
            this.panelSubscriptionSummary$ = this.subscriptions.getSubscriptionSummary().pipe(
                tap({
                    next: (s) => this.summarySignal.set(s),
                    error: () => this.summarySignal.set(null)
                }),
                catchError((): Observable<null> => {
                    this.summarySignal.set(null);
                    return of(null);
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.panelSubscriptionSummary$;
    }

    /** Panel layout: abonelik özeti (dashboard ile çakışmasın diye ensure kullanır). */
    loadForPanel(): void {
        this.ensurePanelSubscriptionSummary().subscribe();
    }

    /** Abonelik sayfası veriyi çekince context’i güncel tutar (çift HTTP kabulü). */
    applySummary(s: SubscriptionSummaryVm): void {
        this.summarySignal.set(s);
    }
}

import { computed, inject, Injectable, signal } from '@angular/core';
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

    /** Son başarılı özet (yüklenmediyse null). */
    readonly summary = this.summarySignal.asReadonly();

    /** Backend özeti yüklendi ve kiracı yazma kilitli. */
    readonly isTenantReadOnly = computed(() => this.summarySignal()?.isReadOnly === true);

    /** Yazma UI’si (mutation) kapalı mı — `isTenantReadOnly` ile aynı anlam. */
    readonly mutationBlocked = this.isTenantReadOnly;

    /** Abonelik ekranına yönlendirilebilir owner/admin. */
    readonly canManageSubscription = computed(() => this.summarySignal()?.canManageSubscription === true);

    /** Panel layout: tek seferlik abonelik özeti. */
    loadForPanel(): void {
        this.subscriptions.getSubscriptionSummary().subscribe({
            next: (s) => this.summarySignal.set(s),
            error: () => this.summarySignal.set(null)
        });
    }

    /** Abonelik sayfası veriyi çekince context’i güncel tutar (çift HTTP kabulü). */
    applySummary(s: SubscriptionSummaryVm): void {
        this.summarySignal.set(s);
    }
}

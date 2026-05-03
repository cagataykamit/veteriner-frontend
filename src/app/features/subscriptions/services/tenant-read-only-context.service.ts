import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import { SUBSCRIPTIONS_MANAGE_CLAIM, SUBSCRIPTIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantAccessService } from '@/app/core/tenant/tenant-access.service';
import type { TenantAccessStateVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import type { SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';

/**
 * Panel genelinde kiracı salt okunur bilgisi — `GET .../tenants/{id}/access-state`.
 * Abonelik özeti (`subscription-summary`) yalnızca abonelik sayfası / ilgili servislerde kullanılır.
 */
@Injectable({ providedIn: 'root' })
export class TenantReadOnlyContextService {
    private readonly auth = inject(AuthService);
    private readonly tenantAccess = inject(TenantAccessService);

    private readonly accessStateSignal = signal<TenantAccessStateVm | null>(null);

    /** Abonelik özetinden gelen `canManageSubscription` (banner metni / senkron); erişim durumu access-state’ten. */
    private readonly subscriptionSummaryPatchSignal = signal<{ readonly canManageSubscription: boolean } | null>(null);

    /** Tek panel oturumunda bir kez HTTP; layout + dashboard ile paylaşılır. */
    private panelTenantAccess$: Observable<TenantAccessStateVm | null> | null = null;

    private panelAccessStreamContextKey: string | null = null;

    /** Son başarılı access-state (yüklenmediyse null). */
    readonly accessState = this.accessStateSignal.asReadonly();

    /** Backend özeti yüklendi ve kiracı yazma kilitli. */
    readonly isTenantReadOnly = computed(() => this.accessStateSignal()?.isReadOnly === true);

    /** Yazma UI’si (mutation) kapalı mı. */
    readonly mutationBlocked = this.isTenantReadOnly;

    /**
     * Abonelik yönetimi için özet patch’i varsa (subscription-summary yüklendiğinde).
     * Banner ve üst düzey CTA ile uyum için korunur.
     */
    readonly canManageSubscription = computed(
        () => this.subscriptionSummaryPatchSignal()?.canManageSubscription === true
    );

    /** Salt okunur banner’da abonelik linkleri — JWT ile abonelik sayfası erişimi olan roller. */
    readonly showReadOnlyBannerSubscriptionActions = computed(() => {
        if (!this.accessStateSignal()?.isReadOnly) {
            return false;
        }
        return (
            this.auth.hasOperationClaim(SUBSCRIPTIONS_READ_CLAIM) ||
            this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM)
        );
    });

    /**
     * Panel için tenant access-state (paylaşımlı).
     */
    ensurePanelTenantAccess(): Observable<TenantAccessStateVm | null> {
        if (!this.canLoadPanelAccessState()) {
            this.accessStateSignal.set(null);
            this.panelTenantAccess$ = null;
            this.panelAccessStreamContextKey = null;
            return of(null);
        }

        const contextKey = this.currentPanelAccessContextKey();
        if (this.panelTenantAccess$ && this.panelAccessStreamContextKey !== contextKey) {
            this.panelTenantAccess$ = null;
        }
        this.panelAccessStreamContextKey = contextKey;

        if (!this.panelTenantAccess$) {
            this.panelTenantAccess$ = this.tenantAccess.getTenantAccessState().pipe(
                tap({
                    next: (s) => this.accessStateSignal.set(s),
                    error: () => this.accessStateSignal.set(null)
                }),
                catchError((): Observable<null> => {
                    this.accessStateSignal.set(null);
                    return of(null);
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.panelTenantAccess$;
    }

    /**
     * @deprecated Dashboard uyumluluğu — `ensurePanelTenantAccess` kullanın.
     * Dönüş tipi historik olarak subscription özeti idi; artık access-state yüklenir.
     */
    ensurePanelSubscriptionSummary(): Observable<TenantAccessStateVm | null> {
        return this.ensurePanelTenantAccess();
    }

    private canLoadPanelAccessState(): boolean {
        if (!this.auth.isAuthenticated() || !this.auth.hasSelectedClinic()) {
            return false;
        }
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());
        return !!tenantId?.trim();
    }

    private currentPanelAccessContextKey(): string {
        const tid = resolveTenantIdFromJwt(this.auth.getAccessToken())?.trim() ?? '';
        const cid = this.auth.getClinicId()?.trim() ?? '';
        return `${tid}::${cid}`;
    }

    /** Panel layout: access-state (dashboard ile çakışmasın diye ensure kullanır). */
    loadForPanel(): void {
        this.ensurePanelTenantAccess().subscribe();
    }

    /**
     * Abonelik veya kurum ayarları özeti yüklendiğinde `canManageSubscription` senkronu (salt okunur bayrağı access-state’tedir).
     */
    applySummary(s: SubscriptionSummaryVm): void {
        this.subscriptionSummaryPatchSignal.set({
            canManageSubscription: !!s.canManageSubscription
        });
    }
}

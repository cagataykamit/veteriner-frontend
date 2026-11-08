import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM, SUBSCRIPTIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SUBSCRIPTION_ROUTE } from '@/app/core/routing/panel-navigation';
import type { PlanFeatureCode } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { plansFromText } from '@/app/entities/subscription/utils/pricing-plan.utils';

const FEATURE_TITLES: Readonly<Record<PlanFeatureCode, string>> = {
    OwnerPortal: 'Hasta sahibi portalı',
    PortalAppointmentRequests: 'Portaldan randevu talebi',
    MultiClinic: 'Birden fazla klinik',
    AutomatedReminders: 'Otomatik hatırlatıcılar',
    AdvancedReports: 'Gelişmiş raporlar',
    VaccinationWizard: 'Otomatik aşı sihirbazı',
    MobileBarcode: 'Kamerayla barkod okutma',
    ClinicsOverview: 'Şubeler özeti',
    CashManagement: 'Kasa kontrolü',
    ExternalApi: 'API erişimi'
};

/**
 * Pakette olmayan özellik için "üst pakete geç" kutusu (TIER-001, `PLAN_FEATURES_API_CONTRACT.md`). Kilidin kararı backend'dedir;
 * çağıran `lockedPlanFeature` ya da sunucu koduna bakıp kutuyu çizer. Gereken paket `access-state`'ten okunur. Abonelik sayfasına
 * erişimi olmayan rolde bağlantı yerine yöneticiye yönlendirir (salt okunur banner ile aynı kural).
 */
@Component({
    selector: 'app-plan-upgrade-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonModule],
    template: `
        <div class="flex flex-col items-start gap-2" role="note" data-testid="plan-upgrade-notice">
            <p class="m-0 font-medium"><i class="pi pi-lock mr-2 text-muted-color" aria-hidden="true"></i>{{ text() }}</p>
            @if (detail(); as d) {
                <p class="m-0 text-sm text-muted-color">{{ d }}</p>
            }
            @if (canOpenSubscription()) {
                <a pButton [routerLink]="subscriptionRoute" class="p-button-sm" data-testid="plan-upgrade-link"><i class="pi pi-arrow-up"></i>Üst pakete geç</a>
            } @else {
                <p class="m-0 text-sm text-muted-color">Paket değişikliği için kurum yöneticinize başvurun.</p>
            }
        </div>
    `
})
export class AppPlanUpgradeNoticeComponent {
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly feature = input.required<PlanFeatureCode>();
    /** Özelliğin bu kliniğe ne kazandıracağı; bir cümle. */
    readonly detail = input<string | null>(null);

    protected readonly subscriptionRoute = SUBSCRIPTION_ROUTE;

    protected readonly text = computed(() => {
        const required = this.ro.lockedPlanFeature(this.feature())?.requiredPlanCode;
        const plans = required ? plansFromText(required) : '';

        return plans ? `${FEATURE_TITLES[this.feature()]} ${plans} var.` : `${FEATURE_TITLES[this.feature()]} mevcut paketinizde yok.`;
    });

    protected readonly canOpenSubscription = computed(
        () => this.auth.hasOperationClaim(SUBSCRIPTIONS_READ_CLAIM) || this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM)
    );
}

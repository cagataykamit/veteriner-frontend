import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM, SUBSCRIPTIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SUBSCRIPTION_ROUTE } from '@/app/core/routing/panel-navigation';
import { TRIAL_LIMIT_ACTION_LABEL } from '@/app/shared/utils/api-error.utils';

/**
 * Deneme (trial) kısıtı uyarısı — `docs/TRIAL_LIMITS_API_CONTRACT.md` §5: sunucunun `detail` metni ve "Aboneliğe geç" bağlantısı.
 * Abonelik sayfasına erişimi olmayan rol için bağlantı yerine yöneticiye yönlendirme metni gösterilir (salt okunur banner ile aynı kural).
 */
@Component({
    selector: 'app-trial-limit-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        <div class="card mb-4 border-amber-200 dark:border-amber-800" role="alert" data-testid="trial-limit-notice">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <i class="pi pi-lock text-amber-600 dark:text-amber-300" aria-hidden="true"></i>
                <span class="text-amber-800 dark:text-amber-200 m-0">{{ message() }}</span>
                @if (canOpenSubscription()) {
                    <a [routerLink]="subscriptionRoute" class="text-primary font-medium no-underline whitespace-nowrap" data-testid="trial-limit-subscription-link">
                        {{ actionLabel }} <i class="pi pi-arrow-right text-xs" aria-hidden="true"></i>
                    </a>
                } @else {
                    <span class="text-muted-color">Abonelik için kurum yöneticinize başvurun.</span>
                }
            </div>
        </div>
    `
})
export class AppTrialLimitNoticeComponent {
    private readonly auth = inject(AuthService);

    readonly message = input.required<string>();

    protected readonly subscriptionRoute = SUBSCRIPTION_ROUTE;
    protected readonly actionLabel = TRIAL_LIMIT_ACTION_LABEL;

    protected readonly canOpenSubscription = computed(
        () => this.auth.hasOperationClaim(SUBSCRIPTIONS_READ_CLAIM) || this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM)
    );
}

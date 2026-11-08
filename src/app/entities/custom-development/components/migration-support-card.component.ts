import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM, IMPORTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { IMPORTS_ROUTE, MIGRATION_SUPPORT_ROUTE } from '@/app/core/routing/panel-navigation';

/**
 * İlk kurulumda "eski programdan geçiş" kartı (TIER-021): içe aktarmaya ve geçiş desteği talebine götürür. Talep ticari olduğundan
 * yalnız `CustomDevelopmentRequests.Manage` (Admin, Owner) görür; yetkisi olmayana kart çizilmez. Ücret ve görüşme süresi talep
 * sayfasında sunucudan okunur, burada yazılmaz.
 */
@Component({
    selector: 'app-migration-support-card',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    host: { '[class.hidden]': '!visible' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible) {
            <div class="card mb-0" data-testid="migration-support-card">
                <h5 class="mt-0 mb-3">Eski programdan geçiş</h5>
                <p class="text-sm text-muted-color mt-0 mb-3">
                    Müşteri, hasta ve aşı geçmişinizi Excel veya CSV dosyasıyla kendiniz aktarabilirsiniz. Yardım isterseniz geçiş desteği ve kurulum görüşmesi talep edin. Dosyanızı e-postayla göndermeyin; panele kendiniz yükleyin.
                </p>
                <div class="flex flex-wrap gap-2">
                    <a pButton [routerLink]="migrationSupportRoute" data-testid="migration-support-card-link"><i class="p-button-icon pi pi-headphones"></i>Geçiş desteği iste</a>
                    @if (canImport) {
                        <a pButton severity="secondary" [routerLink]="importsRoute"><i class="p-button-icon pi pi-upload"></i>Veri içe aktarma</a>
                    }
                </div>
            </div>
        }
    `
})
export class MigrationSupportCardComponent {
    private readonly auth = inject(AuthService);

    readonly migrationSupportRoute = MIGRATION_SUPPORT_ROUTE;
    readonly importsRoute = IMPORTS_ROUTE;
    readonly visible = this.auth.hasOperationClaim(CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM);
    readonly canImport = this.auth.hasOperationClaim(IMPORTS_READ_CLAIM);
}

import { inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DASHBOARD_ROUTE, firstAccessibleRoute, MANAGER_LEVEL_CLAIM, MENU_GROUPS, SETTINGS_ROUTE, TODAY_ROUTE } from '@/app/core/routing/panel-navigation';

/**
 * Giriş sonrası açılış sayfası (ADR-030): yönetici düzeyi Özet'e, Bugün yetkisi olan (Resepsiyon, Hekim) Bugün'e;
 * ikisi de yoksa menüdeki ilk erişilebilir öğe, o da yoksa Ayarlar.
 */
export function panelHomeRoute(hasClaim: (claim: string) => boolean): string {
    if (hasClaim(MANAGER_LEVEL_CLAIM)) {
        return DASHBOARD_ROUTE;
    }

    if (hasClaim(VISITS_READ_CLAIM)) {
        return TODAY_ROUTE;
    }

    return firstAccessibleRoute(MENU_GROUPS, hasClaim) ?? SETTINGS_ROUTE;
}

/** `/panel` açılış yönlendirmesi; kural `panelHomeRoute` içindedir. */
export function panelHomeRedirect(): string {
    const auth = inject(AuthService);

    return panelHomeRoute((claim) => auth.hasOperationClaim(claim));
}

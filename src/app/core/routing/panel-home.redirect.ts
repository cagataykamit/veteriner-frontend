import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DASHBOARD_ROUTE, firstAccessibleRoute, MANAGER_LEVEL_CLAIM, MENU_GROUPS, SETTINGS_ROUTE, TODAY_ROUTE } from '@/app/core/routing/panel-navigation';

/**
 * Giriş sonrası ve logo ile açılan sayfa (ADR-030 eki 2026-11-04): Bugün yetkisi olan herkes (yönetici dahil) Bugün'e;
 * Bugün yetkisi olmayan yönetici düzeyi Özet'e; ikisi de yoksa menüdeki ilk erişilebilir öğe, o da yoksa Ayarlar.
 */
export function panelHomeRoute(hasClaim: (claim: string) => boolean): string {
    if (hasClaim(VISITS_READ_CLAIM)) {
        return TODAY_ROUTE;
    }

    if (hasClaim(MANAGER_LEVEL_CLAIM)) {
        return DASHBOARD_ROUTE;
    }

    return firstAccessibleRoute(MENU_GROUPS, hasClaim) ?? SETTINGS_ROUTE;
}

/**
 * `/panel` açılış yönlendirmesi; kural `panelHomeRoute` içindedir. `redirectTo` değil koruma: yönlendirme kuralları korumalardan önce
 * çalışır, oturumsuz açılışta izinler boş görünür ve hedef Ayarlar olurdu (giriş sonrası `returnUrl` Ayarlar kalırdı). Koruma, panelin
 * `authGuard`'ından sonra çalışır; oturumsuz kullanıcı `returnUrl=/panel` ile girişe gider ve girişten sonra izinlerine göre açılır.
 */
export const panelHomeGuard: CanActivateFn = () => {
    const auth = inject(AuthService);

    return inject(Router).parseUrl(panelHomeRoute((claim) => auth.hasOperationClaim(claim)));
};

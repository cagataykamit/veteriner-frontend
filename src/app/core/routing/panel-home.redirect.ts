import { inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { firstAccessibleRoute, MENU_GROUPS, SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';

/** `/panel` açılış sayfası: menüdeki ilk erişilebilir öğe; Bugün yetkisi olana Bugün (ADR-017 K5). */
export function panelHomeRedirect(): string {
    const auth = inject(AuthService);
    return firstAccessibleRoute(MENU_GROUPS, (claim) => auth.hasOperationClaim(claim)) ?? SETTINGS_ROUTE;
}

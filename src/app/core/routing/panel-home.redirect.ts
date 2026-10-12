import { inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';

/** `/panel` açılış sayfası: günlük çalışma ekranı (Bugün) yetkisi olana Bugün, yoksa Özet. */
export function panelHomeRedirect(): string {
    return inject(AuthService).hasOperationClaim(VISITS_READ_CLAIM) ? 'today' : 'dashboard';
}

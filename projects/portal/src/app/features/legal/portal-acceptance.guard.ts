import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { isAcceptanceComplete, PortalLegalApi } from './portal-legal.api';

/**
 * Engelleyici kabul (ADR-031 K4, ADR-029 madde 5): bekleyen portal belgesi veya onaylanmamış klinik aydınlatma metni
 * varsa portal açılmaz. Sunucu diğer uçları engellemez; engel istemcidedir (sözleşme §5.9).
 */
export const portalAcceptanceGuard: CanActivateFn = async () => {
    const session = inject(PortalSessionService);
    const router = inject(Router);
    const legalApi = inject(PortalLegalApi);

    // Aynı rotadaki guard'lar eşzamanlı çalışır: oturum yoksa yönlendirmeyi kimlik guard'ı yapar, burada istek atılmaz.
    if ((await session.ensureSession()) !== 'authenticated') {
        return false;
    }

    if (session.acceptanceCleared()) {
        return true;
    }

    try {
        if (isAcceptanceComplete(await firstValueFrom(legalApi.myAcceptances()))) {
            session.markAcceptanceCleared();

            return true;
        }
    } catch {
        // Durum okunamadıysa kabul sayfası hatayı ve yeniden denemeyi gösterir.
    }

    return router.createUrlTree(['/accept']);
};

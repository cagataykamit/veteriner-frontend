import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
    DISCOUNT_CODE_QUERY_PARAM,
    normalizeDiscountCodeInput,
    storePendingDiscountCode
} from '@/app/features/sales-partners/utils/discount-code.utils';

/**
 * Satış ortağı bağlantısı `vetinity.com/r/KOD` (ADR-037 madde 6): kodu oturum belleğine alır ve kayıt sayfasına `kod` parametresiyle
 * yönlendirir. Çerez ve localStorage kullanılmaz; kod geçerliliğini kayıt sayfası doğrular.
 */
export const referralCodeRedirect: CanActivateFn = (route) => {
    const router = inject(Router);
    const code = normalizeDiscountCodeInput(route.paramMap.get('code'));

    if (!code) {
        return router.createUrlTree(['/auth/signup']);
    }

    storePendingDiscountCode(code);

    return router.createUrlTree(['/auth/signup'], { queryParams: { [DISCOUNT_CODE_QUERY_PARAM]: code } });
};

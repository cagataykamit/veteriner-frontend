import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';

/** Yalnız Vetinity platform yöneticisi (JWT `platform_admin`); klinik rolleri bulunamadı sayfasına gider (ADR-037). */
export const platformAdminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isPlatformAdmin() ? true : router.createUrlTree(['/notfound']);
};

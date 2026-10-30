import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { OnlineBookingSettingsPageComponent } from '@/app/features/online-booking/pages/online-booking-settings-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: OnlineBookingSettingsPageComponent
    }
] as Routes;

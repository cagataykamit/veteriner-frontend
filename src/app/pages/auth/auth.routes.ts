import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { guestGuard } from '@/app/core/auth/guest.guard';
import { Login } from './login';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';
import { ResetPasswordPageComponent } from './reset-password-page.component';
import { OwnerSignupPageComponent } from './owner-signup-page.component';
import { SelectClinicPage } from './select-clinic';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: 'login', canActivate: [guestGuard], component: Login },
    { path: 'forgot-password', canActivate: [guestGuard], component: ForgotPasswordPageComponent },
    { path: 'reset-password', component: ResetPasswordPageComponent },
    { path: 'signup', canActivate: [guestGuard], component: OwnerSignupPageComponent },
    {
        path: 'select-clinic',
        canActivate: [(route) => {
            const auth = inject(AuthService);
            const router = inject(Router);

            if (auth.isAuthenticated()) {
                return true;
            }

            const returnUrl = route.queryParamMap.get('returnUrl')?.trim() ?? '';
            const inviteToken = route.queryParamMap.get('inviteToken')?.trim() ?? '';

            return router.createUrlTree(['/auth/login'], {
                queryParams: {
                    ...(returnUrl ? { returnUrl } : {}),
                    ...(inviteToken ? { inviteToken } : {})
                }
            });
        }],
        component: SelectClinicPage
    }
] as Routes;

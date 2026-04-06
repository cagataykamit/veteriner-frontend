import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { guestGuard } from '@/app/core/auth/guest.guard';
import { Login } from '@/app/pages/auth/login';
import { OwnerSignupPageComponent } from '@/app/pages/auth/owner-signup-page.component';
import { SelectClinicPage } from '@/app/pages/auth/select-clinic';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: 'login', canActivate: [guestGuard], component: Login },
    { path: 'signup', canActivate: [guestGuard], component: OwnerSignupPageComponent },
    {
        path: 'select-clinic',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
        }],
        component: SelectClinicPage
    }
] as Routes;

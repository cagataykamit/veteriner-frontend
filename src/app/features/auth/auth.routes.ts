import { Routes } from '@angular/router';
import { guestGuard } from '@/app/core/auth/guest.guard';
import { Login } from '@/app/pages/auth/login';

export default [
    {
        path: '',
        canActivate: [guestGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'login' },
            { path: 'login', component: Login }
        ]
    }
] as Routes;

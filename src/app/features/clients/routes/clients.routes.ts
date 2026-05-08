import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLIENTS_CREATE_CLAIM,
    CLIENTS_READ_CLAIM,
    CLIENTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ClientDetailPageComponent } from '@/app/features/clients/pages/client-detail-page/client-detail-page.component';
import { ClientEditPageComponent } from '@/app/features/clients/pages/client-edit-page/client-edit-page.component';
import { ClientNewPageComponent } from '@/app/features/clients/pages/client-new-page/client-new-page.component';
import { ClientsListPageComponent } from '@/app/features/clients/pages/clients-list-page/clients-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClientsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLIENTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClientNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLIENTS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClientEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClientDetailPageComponent
    }
] as Routes;

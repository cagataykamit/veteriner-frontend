import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLIENTS_CREATE_CLAIM,
    CLIENTS_READ_CLAIM,
    CLIENTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ClientDataExportPageComponent } from '@/app/features/clients/pages/client-data-export-page/client-data-export-page.component';
import { ClientDetailPageComponent } from '@/app/features/clients/pages/client-detail-page/client-detail-page.component';
import { ClientEditPageComponent } from '@/app/features/clients/pages/client-edit-page/client-edit-page.component';
import { ClientKvkkFormPageComponent } from '@/app/features/clients/pages/client-kvkk-form-page/client-kvkk-form-page.component';
import { ClientNewPageComponent } from '@/app/features/clients/pages/client-new-page/client-new-page.component';
import { ClientsListPageComponent } from '@/app/features/clients/pages/clients-list-page/clients-list-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { unsavedChangesGuard } from '@/app/shared/ui/unsaved-changes/unsaved-changes.guard';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_CREATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientNewPageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_UPDATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientEditPageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id/kvkk-form',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientKvkkFormPageComponent
    },
    {
        path: ':id/kvkk-disclosure',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        data: { kvkkKind: 'disclosure' },
        component: ClientKvkkFormPageComponent
    },
    {
        path: ':id/data-export',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientDataExportPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(CLIENTS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ClientDetailPageComponent
    }
] as Routes;

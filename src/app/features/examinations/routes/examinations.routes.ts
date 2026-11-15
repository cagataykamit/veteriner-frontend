import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    EXAMINATIONS_CREATE_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    EXAMINATIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ExaminationDetailPageComponent } from '@/app/features/examinations/pages/examination-detail-page/examination-detail-page.component';
import { ExaminationWorkspacePageComponent } from '@/app/features/examinations/pages/examination-workspace-page/examination-workspace-page.component';
import { ExaminationsListPageComponent } from '@/app/features/examinations/pages/examinations-list-page/examinations-list-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { unsavedChangesGuard } from '@/app/shared/ui/unsaved-changes/unsaved-changes.guard';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ExaminationsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ExaminationWorkspacePageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(EXAMINATIONS_UPDATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ExaminationWorkspacePageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: ExaminationDetailPageComponent,
        canDeactivate: [unsavedChangesGuard]
    }
] as Routes;

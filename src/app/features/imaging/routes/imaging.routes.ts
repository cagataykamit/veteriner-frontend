import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CREATE_CLAIM, IMAGING_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ImagingDetailPageComponent } from '@/app/features/imaging/pages/imaging-detail-page/imaging-detail-page.component';
import { ImagingListPageComponent } from '@/app/features/imaging/pages/imaging-list-page/imaging-list-page.component';
import { ImagingNewPageComponent } from '@/app/features/imaging/pages/imaging-new-page/imaging-new-page.component';

function requireClaim(claim: string) {
    return () => {
        const auth = inject(AuthService);

        return auth.hasOperationClaim(claim) ? true : inject(Router).createUrlTree(['/notfound']);
    };
}

export default [
    { path: '', canActivate: [requireClaim(IMAGING_READ_CLAIM)], component: ImagingListPageComponent },
    { path: 'new', canActivate: [requireClaim(IMAGING_CREATE_CLAIM)], component: ImagingNewPageComponent },
    { path: ':id', canActivate: [requireClaim(IMAGING_READ_CLAIM)], component: ImagingDetailPageComponent }
] as Routes;

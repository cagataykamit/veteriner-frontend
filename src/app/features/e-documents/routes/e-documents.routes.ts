import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { EDOCUMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { EDocumentsPageComponent } from '@/app/features/e-documents/pages/e-documents-page.component';

const requireRead: CanActivateFn = () =>
    inject(AuthService).hasOperationClaim(EDOCUMENTS_READ_CLAIM) ? true : inject(Router).createUrlTree(['/notfound']);

export default [{ path: '', canActivate: [requireRead], component: EDocumentsPageComponent }] as Routes;

import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PETS_CREATE_CLAIM,
    PETS_READ_CLAIM,
    PETS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { PetDetailPageComponent } from '@/app/features/pets/pages/pet-detail-page/pet-detail-page.component';
import { PetEditPageComponent } from '@/app/features/pets/pages/pet-edit-page/pet-edit-page.component';
import { PetNewPageComponent } from '@/app/features/pets/pages/pet-new-page/pet-new-page.component';
import { PetsListPageComponent } from '@/app/features/pets/pages/pets-list-page/pets-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PETS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PetsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PETS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PetNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PETS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PetEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PETS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PetDetailPageComponent
    }
] as Routes;

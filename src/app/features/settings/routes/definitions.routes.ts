import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { DEFINITION_ENTRIES, visibleEntries } from '@/app/core/routing/panel-navigation';
import { DefinitionsPageComponent } from '@/app/features/settings/pages/definitions-page.component';

export default [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                const ok = visibleEntries(DEFINITION_ENTRIES, (claim) => auth.hasOperationClaim(claim)).length > 0;
                return ok ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: DefinitionsPageComponent
    },
    { path: 'species', loadChildren: () => import('../../species/routes/species.routes') },
    { path: 'breeds', loadChildren: () => import('../../breeds/routes/breeds.routes') },
    { path: 'product-categories', loadChildren: () => import('../../inventory/routes/product-categories.routes') },
    { path: 'clinical-terms', loadChildren: () => import('../../clinical-terms/routes/clinical-terms.routes') }
] as Routes;

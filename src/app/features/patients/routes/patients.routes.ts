import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_DELETE_CLAIM, CLIENTS_READ_CLAIM, PETS_DELETE_CLAIM, PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DeletedRecordsPageComponent } from '@/app/features/patients/pages/deleted-records-page/deleted-records-page.component';
import { PatientsHomePageComponent } from '@/app/features/patients/pages/patients-home-page/patients-home-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

/** İzinlerden herhangi biri yeterli; yoksa yetkisiz sayfası. */
const anyClaimGuard = (...claims: string[]) => () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return claims.some((claim) => auth.hasOperationClaim(claim)) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
};

export default [
    {
        path: '',
        canActivate: [anyClaimGuard(CLIENTS_READ_CLAIM, PETS_READ_CLAIM)],
        component: PatientsHomePageComponent
    },
    {
        // Silinen müşteri ve hastalar (ADR-054 K6): müşteride `Clients.Delete`, hastada `Pets.Delete`; sayfa yalnız yetkili görünümü gösterir.
        path: 'deleted',
        canActivate: [anyClaimGuard(CLIENTS_DELETE_CLAIM, PETS_DELETE_CLAIM)],
        component: DeletedRecordsPageComponent
    }
] as Routes;

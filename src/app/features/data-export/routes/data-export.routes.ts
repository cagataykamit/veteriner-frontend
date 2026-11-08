import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { DATA_EXPORT_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DataExportPageComponent } from '@/app/features/data-export/pages/data-export-page.component';

/** Ayarlar > Verimi dışa aktar (`DATA_EXPORT_API_CONTRACT.md` §2): yalnız `DataExport.Manage` (Admin, Owner). */
export default [
    {
        path: '',
        title: 'Verimi dışa aktar',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(DATA_EXPORT_MANAGE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: DataExportPageComponent
    }
] as Routes;

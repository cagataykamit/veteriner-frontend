import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ClinicSiteStateDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

const GRANT_PROBLEM_MESSAGES = {
    'ClinicSites.NotFound': 'Bu adreste klinik sitesi bulunamadı. Adresi kontrol edin.',
    'ClinicSites.Validation': 'Ek hak sayısı 1 ile 3 arasında olmalı.',
    'Auth.PermissionDenied': 'Bu işlem için yetkiniz yok. Yalnız Vetinity platform yöneticisi hak verebilir.'
};

/** Destek işi (sözleşme §4): `slug` sitenin güncel ya da eski adresi olabilir. */
@Injectable({ providedIn: 'root' })
export class ClinicAddressesService {
    private readonly api = inject(ApiClient);

    grantAddressChanges(slug: string, additionalChanges: number): Observable<ClinicSiteStateDto> {
        return this.api
            .post<ClinicSiteStateDto>(ApiEndpoints.clinicAddressGrants.grant(slug), { additionalChanges })
            .pipe(toUserError<ClinicSiteStateDto>('Hak verilemedi.', GRANT_PROBLEM_MESSAGES));
    }
}

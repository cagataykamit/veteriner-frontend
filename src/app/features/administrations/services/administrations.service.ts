import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    administrationsQueryToHttpParams,
    mapAdministrationCreateResultDtoToVm,
    mapAdministrationDtoToVm,
    mapCreateAdministrationToApiBody,
    mapPagedAdministrationsToVm
} from '@/app/features/administrations/data/administration.mapper';
import type {
    AdministrationCreateResultDto,
    AdministrationDto,
    AdministrationPagedResultDto
} from '@/app/features/administrations/models/administration-api.model';
import type {
    AdministrationCreateResultVm,
    AdministrationStockOutcome,
    AdministrationsListQuery,
    AdministrationsPagedVm,
    AdministrationVm,
    CreateAdministrationRequest
} from '@/app/features/administrations/models/administration-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class AdministrationsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Aktif klinik kapsamında uygulama listesi (kapsamsız liste yoktur). */
    getAdministrations(query: AdministrationsListQuery = {}): Observable<AdministrationsPagedVm> {
        const clinicId = query.clinicId?.trim() || this.auth.getClinicId()?.trim() || undefined;
        return this.api
            .get<AdministrationPagedResultDto>(ApiEndpoints.administrations.list(), administrationsQueryToHttpParams({ ...query, clinicId }))
            .pipe(map(mapPagedAdministrationsToVm), toUserError('Uygulama listesi yüklenemedi.'));
    }

    /** 201 yeni uygulama (stok düşer); 200 aynı `requestId` ile daha önce kaydedilmiş uygulama (`created: false`, hata değildir). */
    createAdministration(req: CreateAdministrationRequest): Observable<AdministrationCreateResultVm> {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            return throwError(() => new Error('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api
            .post<AdministrationCreateResultDto>(ApiEndpoints.administrations.list(), mapCreateAdministrationToApiBody(clinicId, req))
            .pipe(map(mapAdministrationCreateResultDtoToVm), toUserError('Uygulama kaydedilemedi.'));
    }

    /** `Administrations.Correct`; `StockReturned` stoğu ters hareketle geri verir, `WrittenOff` (zarar/imha) stoğa dokunmaz. Güncel (iptal edilmiş) kaydı döner. */
    voidAdministration(id: string, reason: string, stockOutcome: AdministrationStockOutcome = 'StockReturned'): Observable<AdministrationVm> {
        return this.api
            .post<AdministrationDto>(ApiEndpoints.administrations.void(id), { reason: reason.trim(), stockOutcome })
            .pipe(map(mapAdministrationDtoToVm), toUserError('Uygulama iptal edilemedi.'));
    }
}

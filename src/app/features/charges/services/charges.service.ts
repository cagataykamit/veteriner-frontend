import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    chargesQueryToHttpParams,
    mapChargeCreateResultDtoToVm,
    mapChargeDtoToVm,
    mapCorrectChargeToApiBody,
    mapCreateChargeToApiBody,
    mapPagedChargesToVm
} from '@/app/features/charges/data/charge.mapper';
import type { ChargeCreateResultDto, ChargeDto, ChargePagedResultDto } from '@/app/features/charges/models/charge-api.model';
import type {
    ChargeCreateResultVm,
    ChargesListQuery,
    ChargesPagedVm,
    ChargeVm,
    CorrectChargeRequest,
    CreateChargeRequest
} from '@/app/features/charges/models/charge-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ChargesService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Aktif klinik kapsamında ücret listesi (kapsamsız kiracı geneli liste yoktur). */
    getCharges(query: ChargesListQuery = {}): Observable<ChargesPagedVm> {
        const clinicId = query.clinicId?.trim() || this.auth.getClinicId()?.trim() || undefined;
        return this.api
            .get<ChargePagedResultDto>(ApiEndpoints.charges.list(), chargesQueryToHttpParams({ ...query, clinicId }))
            .pipe(map(mapPagedChargesToVm), toUserError('Ücret listesi yüklenemedi.'));
    }

    /** 201 yeni ücret; 200 aynı `requestId` ile daha önce kaydedilmiş ücret (`created: false`, hata değildir). */
    createCharge(req: CreateChargeRequest): Observable<ChargeCreateResultVm> {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            return throwError(() => new Error('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api
            .post<ChargeCreateResultDto>(ApiEndpoints.charges.list(), mapCreateChargeToApiBody(clinicId, req))
            .pipe(map(mapChargeCreateResultDtoToVm), toUserError('Ücret kaydedilemedi.'));
    }

    /** `Charges.Correct`; yeni tutar tahsis edilen tutarın altına inemez (409 `Charges.CorrectionBelowAllocated`). Güncel ücreti döner. */
    correctCharge(id: string, req: CorrectChargeRequest): Observable<ChargeVm> {
        return this.api
            .put<ChargeDto>(ApiEndpoints.charges.byId(id), mapCorrectChargeToApiBody(req))
            .pipe(map(mapChargeDtoToVm), toUserError('Ücret düzeltilemedi.'));
    }

    /** `Charges.Correct`; tahsisli ücret iptal edilemez (409 `Charges.VoidBlockedByAllocation`). 204. */
    voidCharge(id: string, reason: string): Observable<void> {
        return this.api
            .post<void>(ApiEndpoints.charges.void(id), { reason: reason.trim() })
            .pipe(map(() => void 0), toUserError('Ücret iptal edilemedi.'));
    }
}

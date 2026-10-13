import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    careInstructionsQueryToHttpParams,
    mapCreateCareInstructionToApiBody,
    mapPagedCareInstructionsToVm,
    mapUpdateCareInstructionToApiBody
} from '@/app/features/care-instructions/data/care-instruction.mapper';
import type {
    CareInstructionPagedResultDto,
    CareInstructionWriteResultDto
} from '@/app/features/care-instructions/models/care-instruction-api.model';
import type {
    CareInstructionsListQuery,
    CareInstructionVm,
    CreateCareInstructionRequest
} from '@/app/features/care-instructions/models/care-instruction-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class CareInstructionsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Yeniden eskiye (sunucu sırası); aktif klinik kapsamında. */
    getCareInstructions(query: CareInstructionsListQuery): Observable<CareInstructionVm[]> {
        const clinicId = this.auth.getClinicId()?.trim() || undefined;
        return this.api
            .get<CareInstructionPagedResultDto>(ApiEndpoints.careInstructions.list(), careInstructionsQueryToHttpParams(query, clinicId))
            .pipe(map(mapPagedCareInstructionsToVm), toUserError('Bakım talimatları yüklenemedi.'));
    }

    createCareInstruction(req: CreateCareInstructionRequest): Observable<{ id: string }> {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            return throwError(() => new Error('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.'));
        }
        return this.api
            .post<string>(ApiEndpoints.careInstructions.list(), mapCreateCareInstructionToApiBody(clinicId, req))
            .pipe(
                map((id) => ({ id })),
                toUserError('Bakım talimatı kaydedilemedi.')
            );
    }

    /**
     * PUT; yalnız metin değişir, `rowVersion` zorunludur. Çakışma kodunu (`CareInstructions.ConcurrencyConflict`)
     * ayrıştırabilmek için hata ham `HttpErrorResponse` olarak iletilir.
     */
    updateCareInstruction(id: string, text: string, rowVersion: string): Observable<CareInstructionWriteResultDto> {
        return this.api.put<CareInstructionWriteResultDto>(
            ApiEndpoints.careInstructions.byId(id),
            mapUpdateCareInstructionToApiBody(text, rowVersion)
        );
    }
}

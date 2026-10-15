import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapChargeCreateResultDtoToVm } from '@/app/features/charges/data/charge.mapper';
import {
    chargeSuggestionsQueryToHttpParams,
    mapChargeSuggestionDtoToVm,
    mapConvertChargeSuggestionToApiBody,
    mapPagedChargeSuggestionsToVm
} from '@/app/features/charges/data/charge-suggestion.mapper';
import type {
    ChargeSuggestionDto,
    ChargeSuggestionPagedResultDto
} from '@/app/features/charges/models/charge-suggestion-api.model';
import type { ChargeCreateResultDto } from '@/app/features/charges/models/charge-api.model';
import type {
    ChargeSuggestionsListQuery,
    ChargeSuggestionsPagedVm,
    ChargeSuggestionVm,
    ConvertChargeSuggestionRequest
} from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ChargeCreateResultVm } from '@/app/features/charges/models/charge-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ChargeSuggestionsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Aktif klinik kapsamında yalnız bekleyen kalemler; her zaman sunucudan okunur. */
    getPending(query: ChargeSuggestionsListQuery = {}): Observable<ChargeSuggestionsPagedVm> {
        const clinicId = this.auth.getClinicId()?.trim() || undefined;

        return this.api
            .get<ChargeSuggestionPagedResultDto>(ApiEndpoints.chargeSuggestions.list(), chargeSuggestionsQueryToHttpParams({ ...query, clinicId }))
            .pipe(map(mapPagedChargeSuggestionsToVm), toUserError('Bekleyen ücretler yüklenemedi.'));
    }

    /** 201 yeni ücret; 200 aynı `requestId` ile daha önce yazılmış ücret (`created: false`, hata değildir). */
    convert(id: string, req: ConvertChargeSuggestionRequest): Observable<ChargeCreateResultVm> {
        return this.api
            .post<ChargeCreateResultDto>(ApiEndpoints.chargeSuggestions.convert(id), mapConvertChargeSuggestionToApiBody(req))
            .pipe(map(mapChargeCreateResultDtoToVm), toUserError('Ücrete çevrilemedi.'));
    }

    /** Gerekçeli (5–500), geri alınmaz; kalem listeden düşer. */
    waive(id: string, reason: string): Observable<ChargeSuggestionVm> {
        return this.api
            .post<ChargeSuggestionDto>(ApiEndpoints.chargeSuggestions.waive(id), { reason: reason.trim() })
            .pipe(map(mapChargeSuggestionDtoToVm), toUserError('Kalem ücretsiz sayılamadı.'));
    }
}

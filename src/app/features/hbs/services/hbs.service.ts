import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { HbsDataDto, HbsEntryDto, HbsEntryVm, HbsRecordKind, UpdateHbsEntryRequest } from '@/app/features/hbs/models/hbs.model';
import { mapHbsEntryDtoToVm } from '@/app/features/hbs/utils/hbs-status.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const ENDPOINTS: Readonly<Record<HbsRecordKind, { hbsData: (id: string) => string; hbs: (id: string) => string }>> = {
    prescription: ApiEndpoints.prescriptions,
    vaccination: ApiEndpoints.vaccinations
};

/** HBS hazır verisi ve geri kaydı (reçete e-Reçete, aşı ATS); uçlar kayıt türüne göre seçilir. */
@Injectable({ providedIn: 'root' })
export class HbsService {
    private readonly api = inject(ApiClient);

    getHbsData(kind: HbsRecordKind, id: string): Observable<HbsDataDto> {
        return this.api
            .get<HbsDataDto>(ENDPOINTS[kind].hbsData(id))
            .pipe(catchError((err: unknown) => throwError(() => new Error(panelHttpFailureMessage(err, 'HBS verisi yüklenemedi.')))));
    }

    updateHbsEntry(kind: HbsRecordKind, id: string, body: UpdateHbsEntryRequest): Observable<HbsEntryVm> {
        return this.api.patch<HbsEntryDto>(ENDPOINTS[kind].hbs(id), body).pipe(
            map((dto) => {
                const vm = mapHbsEntryDtoToVm(dto);

                if (!vm) {
                    throw new Error('HBS kaydı yanıtı okunamadı.');
                }

                return vm;
            }),
            catchError((err: unknown) => throwError(() => new Error(panelHttpFailureMessage(err, 'HBS kaydı kaydedilemedi.'))))
        );
    }
}

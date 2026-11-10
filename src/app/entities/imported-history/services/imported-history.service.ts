import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { ImportedAccountEntryPageDto, ImportedClinicalRecordDto, ImportedPageDto } from '@/app/entities/imported-history/models/imported-history.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Eski programdan aktarılan klinik geçmiş ve hesap hareketleri (§12.8); yalnız okuma. */
@Injectable({ providedIn: 'root' })
export class ImportedHistoryService {
    private readonly api = inject(ApiClient);

    /** `Examinations.Read`; yalnız erişilebilen kliniklerin kayıtları, yeniden eskiye. */
    getPetClinicalRecords(petId: string, page: number, pageSize: number): Observable<ImportedPageDto<ImportedClinicalRecordDto>> {
        return this.api
            .get<ImportedPageDto<ImportedClinicalRecordDto>>(ApiEndpoints.pets.importedClinicalRecords(petId), pageParams(page, pageSize))
            .pipe(toUserError('Eski program kayıtları yüklenemedi.'));
    }

    /** `Charges.Read`; `totals` bilgi amaçlıdır, müşteri bakiyesini etkilemez. */
    getClientAccountEntries(clientId: string, page: number, pageSize: number): Observable<ImportedAccountEntryPageDto> {
        return this.api
            .get<ImportedAccountEntryPageDto>(ApiEndpoints.clients.importedAccountEntries(clientId), pageParams(page, pageSize))
            .pipe(toUserError('Eski program hareketleri yüklenemedi.'));
    }
}

function pageParams(page: number, pageSize: number): HttpParams {
    return new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
}

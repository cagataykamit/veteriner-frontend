import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { deletedRecordsQueryToHttpParams, mapDeletedClientDtoToRow, mapDeletedPetDtoToRow, mapDeletedRecordsPage } from '@/app/entities/record-deletion/data/record-deletion.mapper';
import type {
    DeletableRecordKind,
    DeletedClientDto,
    DeletedPetDto,
    DeletedRecordsPageDto,
    DeletedRecordsPagedVm,
    DeletedRecordsQuery
} from '@/app/entities/record-deletion/models/record-deletion.model';
import { toRecordDeletionError } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { toUserError } from '@/app/shared/utils/api-error.utils';

const SUBJECT: Record<DeletableRecordKind, string> = { client: 'Müşteri', pet: 'Hasta' };

/**
 * Müşteri ve hasta yumuşak silme uçları (`CLIENT_PET_DELETION_API_CONTRACT.md`): silme, geri yükleme ve "Silinenler" listesi.
 * İzin müşteride `Clients.Delete`, hastada `Pets.Delete`; ikisi de tekrar güvenli (zaten silinmiş / silinmemiş → 204).
 * Silme ve geri yükleme hataları `RecordDeletionError` taşır (engel nedenleri, çakışan müşteri).
 */
@Injectable({ providedIn: 'root' })
export class RecordDeletionService {
    private readonly api = inject(ApiClient);

    /** Müşteri silinince silinmemiş tüm hastaları da silinir (ADR-054 K4). */
    delete(kind: DeletableRecordKind, id: string): Observable<void> {
        const path = kind === 'client' ? ApiEndpoints.clients.byId(id) : ApiEndpoints.pets.byId(id);

        return this.api.delete<unknown>(path).pipe(
            map(() => void 0),
            toRecordDeletionError(`${SUBJECT[kind]} silinemedi.`)
        );
    }

    /** Müşteri geri yüklenince onunla birlikte silinen hastalar da gelir; hasta, müşterisi silinmişken geri yüklenemez (K6). */
    restore(kind: DeletableRecordKind, id: string): Observable<void> {
        const path = kind === 'client' ? ApiEndpoints.clients.restore(id) : ApiEndpoints.pets.restore(id);

        return this.api.post<unknown>(path, {}).pipe(
            map(() => void 0),
            toRecordDeletionError(`${SUBJECT[kind]} geri yüklenemedi.`)
        );
    }

    /** En son silinen önce; hasta araması yalnız hasta alanlarına bakar (sahip adı aranmaz). */
    listDeleted(kind: DeletableRecordKind, query: DeletedRecordsQuery): Observable<DeletedRecordsPagedVm> {
        const params = deletedRecordsQueryToHttpParams(query);
        const failure = toUserError<DeletedRecordsPagedVm>(kind === 'client' ? 'Silinen müşteriler yüklenemedi.' : 'Silinen hastalar yüklenemedi.');

        return kind === 'client'
            ? this.api.get<DeletedRecordsPageDto<DeletedClientDto>>(ApiEndpoints.clients.deleted(), params).pipe(map((dto) => mapDeletedRecordsPage(dto, mapDeletedClientDtoToRow)), failure)
            : this.api.get<DeletedRecordsPageDto<DeletedPetDto>>(ApiEndpoints.pets.deleted(), params).pipe(map((dto) => mapDeletedRecordsPage(dto, mapDeletedPetDtoToRow)), failure);
    }
}

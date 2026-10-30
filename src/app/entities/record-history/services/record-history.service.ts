import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapRecordChangeDtoToVm } from '@/app/entities/record-history/data/record-history.mapper';
import type { RecordChangeDto, RecordChangeVm, RecordHistoryResource } from '@/app/entities/record-history/models/record-history.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class RecordHistoryService {
    private readonly api = inject(ApiClient);

    /** Yeniden eskiye; kayıt yoksa veya erişim dışındaysa sunucu boş liste döner. */
    getHistory(resource: RecordHistoryResource, id: string): Observable<RecordChangeVm[]> {
        return this.api.get<RecordChangeDto[]>(ApiEndpoints.recordHistory(resource, id)).pipe(
            map((rows) => (rows ?? []).map(mapRecordChangeDtoToVm)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Değişiklik geçmişi yüklenemedi.')))
            )
        );
    }
}

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    extractCreatedSpeciesIdFromPostResponse,
    mapSpeciesDetailDtoToVm,
    mapSpeciesListResponseToVm,
    mapSpeciesUpsertToApiBody,
    speciesListQueryToHttpParams
} from '@/app/features/species/data/species.mapper';
import type { SpeciesDetailDto } from '@/app/features/species/models/species-api.model';
import type { SpeciesUpsertRequest } from '@/app/features/species/models/species-upsert.model';
import type { SpeciesDetailVm, SpeciesListItemVm } from '@/app/features/species/models/species-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class SpeciesService {
    private readonly api = inject(ApiClient);

    /**
     * GET `/api/v1/species`.
     * `activeOnly: true` → istek **`isActive=true`** query ile gider (sunucu filtreler); istemci tarafında tekrar filtre yok.
     * Parametresiz / `activeOnly` yok → tam liste (panel tür listesi).
     */
    getSpeciesList(options?: { activeOnly?: boolean }): Observable<SpeciesListItemVm[]> {
        const params = speciesListQueryToHttpParams(options);
        return this.api.get<unknown>(ApiEndpoints.species.list(), params).pipe(
            map((raw) => mapSpeciesListResponseToVm(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Tür listesi yüklenemedi.')))
            )
        );
    }

    getSpeciesById(id: string): Observable<SpeciesDetailVm> {
        return this.api.get<SpeciesDetailDto>(ApiEndpoints.species.byId(id)).pipe(
            map((dto) => mapSpeciesDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Tür kaydı bulunamadı veya yüklenemedi.')))
            )
        );
    }

    createSpecies(payload: SpeciesUpsertRequest): Observable<{ id: string }> {
        return this.api.post<unknown>(ApiEndpoints.species.list(), mapSpeciesUpsertToApiBody(payload)).pipe(
            map((raw) => {
                const id = extractCreatedSpeciesIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('SPECIES_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                if (err instanceof Error && err.message === 'SPECIES_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında tür kimliği okunamadı. Kayıt oluşmuş olabilir; tür listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Tür kaydı oluşturulamadı.')
                );
            })
        );
    }

    updateSpecies(id: string, payload: SpeciesUpsertRequest): Observable<void> {
        return this.api.put<unknown>(ApiEndpoints.species.byId(id), mapSpeciesUpsertToApiBody(payload)).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Tür kaydı güncellenemedi.')
                );
            })
        );
    }
}

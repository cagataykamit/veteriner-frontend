import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapPetColorListResponseToSelectOptions } from '@/app/features/pets/data/pet-color.mapper';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class PetColorsService {
    private readonly api = inject(ApiClient);

    /** PetColors kataloğu — yeni hayvan / düzenleme renk seçici. */
    getPetColors(): Observable<SelectOption[]> {
        return this.api.get<unknown>(ApiEndpoints.petColors.list()).pipe(
            map((raw) => mapPetColorListResponseToSelectOptions(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Renk listesi yüklenemedi.')))
            )
        );
    }
}

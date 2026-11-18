import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapOwnerExplanationDtoToVm } from '@/app/entities/owner-explanation/data/owner-explanation.mapper';
import type { OwnerExplanationDto } from '@/app/entities/owner-explanation/models/owner-explanation-api.model';
import type { OwnerExplanationVm } from '@/app/entities/owner-explanation/models/owner-explanation-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Muayeneye bağlı hasta sahibine açıklamalar (`Examinations.Read`); oluşturma yalnız AI taslağı kabulüyle (`AiService.acceptDraft`). */
@Injectable({ providedIn: 'root' })
export class OwnerExplanationsService {
    private readonly api = inject(ApiClient);

    /** Yeniden eskiye. */
    getForExamination(examinationId: string): Observable<OwnerExplanationVm[]> {
        return this.api.get<OwnerExplanationDto[]>(ApiEndpoints.examinations.ownerExplanations(examinationId)).pipe(
            map((rows) => (rows ?? []).map(mapOwnerExplanationDtoToVm)),
            toUserError('Hasta sahibine açıklamalar yüklenemedi.')
        );
    }
}

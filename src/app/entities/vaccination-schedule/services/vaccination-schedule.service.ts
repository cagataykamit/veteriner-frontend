import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    VaccinationPlanApplyItem,
    VaccinationPlanApplyResultDto,
    VaccinationPlanDto,
    VaccinationScheduleDto,
    VaccinationScheduleItemBody,
    VaccinationScheduleItemDto,
    VaccinationScheduleTemplateResultDto
} from '@/app/entities/vaccination-schedule/models/vaccination-schedule.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Otomatik aşı sihirbazı uçları (TIER-005, `VACCINATION_SCHEDULE_API_CONTRACT.md`). */
@Injectable({ providedIn: 'root' })
export class VaccinationScheduleService {
    private readonly api = inject(ApiClient);

    getSchedule(speciesId?: string | null): Observable<VaccinationScheduleDto> {
        const params = speciesId ? new HttpParams().set('speciesId', speciesId) : undefined;

        return this.api.get<VaccinationScheduleDto>(ApiEndpoints.vaccinationSchedule.items(), params).pipe(toUserError('Aşı takvimi yüklenemedi.'));
    }

    createItem(body: VaccinationScheduleItemBody): Observable<VaccinationScheduleItemDto> {
        return this.api.post<VaccinationScheduleItemDto>(ApiEndpoints.vaccinationSchedule.items(), body).pipe(toUserError('Takvim satırı eklenemedi.'));
    }

    updateItem(id: string, body: VaccinationScheduleItemBody): Observable<VaccinationScheduleItemDto> {
        return this.api.put<VaccinationScheduleItemDto>(ApiEndpoints.vaccinationSchedule.item(id), body).pipe(toUserError('Takvim satırı kaydedilemedi.'));
    }

    deleteItem(id: string): Observable<void> {
        return this.api.delete<void>(ApiEndpoints.vaccinationSchedule.item(id)).pipe(toUserError('Takvim satırı silinemedi.'));
    }

    loadStarterTemplate(): Observable<VaccinationScheduleTemplateResultDto> {
        return this.api
            .post<VaccinationScheduleTemplateResultDto>(ApiEndpoints.vaccinationSchedule.starterTemplate(), {})
            .pipe(toUserError('Başlangıç şablonu yüklenemedi.'));
    }

    getPetPlan(petId: string): Observable<VaccinationPlanDto> {
        return this.api.get<VaccinationPlanDto>(ApiEndpoints.vaccinationSchedule.petPlan(petId)).pipe(toUserError('Aşı planı hesaplanamadı.'));
    }

    applyPetPlan(petId: string, clinicId: string, items: readonly VaccinationPlanApplyItem[]): Observable<VaccinationPlanApplyResultDto> {
        return this.api
            .post<VaccinationPlanApplyResultDto>(ApiEndpoints.vaccinationSchedule.petPlan(petId), { clinicId, items })
            .pipe(toUserError('Aşı planı kaydedilemedi.'));
    }
}

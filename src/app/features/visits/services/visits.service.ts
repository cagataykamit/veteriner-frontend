import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCorrectVisitToApiBody,
    findVeterinarianUserId,
    mapCreateVisitToApiBody,
    mapRestoreVisitToApiBody,
    mapUrgencyToApiBody,
    mapTodayDtoToVm,
    mapVeterinarianDtoToVm,
    mapVisitCreateResultDtoToVm,
    mapVisitDtoToVm,
    todayQueryToHttpParams
} from '@/app/features/visits/data/visit.mapper';
import type {
    TodayDto,
    VeterinarianDto,
    VisitCreateResultDto,
    VisitDto
} from '@/app/features/visits/models/visit-api.model';
import type {
    CorrectVisitRequest,
    CreateVisitRequest,
    TodayQuery,
    TodayVm,
    VeterinarianVm,
    VisitCreateResultVm,
    VisitVm
} from '@/app/features/visits/models/visit-vm.model';
import { toUserError } from '@/app/shared/utils/to-user-error.operator';

@Injectable({ providedIn: 'root' })
export class VisitsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Aktif klinik için İstanbul gününün kuyruğu (randevular + gelen hastalar). */
    getToday(query: TodayQuery = {}): Observable<TodayVm> {
        const params = todayQueryToHttpParams(this.auth.getClinicId()?.trim() || null, query);
        return this.api.get<TodayDto>(ApiEndpoints.visits.today(), params).pipe(
            map(mapTodayDtoToVm),
            toUserError('Bugün listesi yüklenemedi.')
        );
    }

    getVisitById(id: string): Observable<VisitVm> {
        return this.api.get<VisitDto>(ApiEndpoints.visits.byId(id)).pipe(
            map(mapVisitDtoToVm),
            toUserError('Geliş kaydı yüklenemedi.')
        );
    }

    getVeterinarians(clinicId: string): Observable<VeterinarianVm[]> {
        return this.api.get<VeterinarianDto[]>(ApiEndpoints.clinics.veterinarians(clinicId)).pipe(
            map((list) => list.map(mapVeterinarianDtoToVm)),
            toUserError('Hekim listesi yüklenemedi.')
        );
    }

    /**
     * Giriş yapan kullanıcı aktif klinikte hekimse kimliği, değilse `null`. Kural backend ile aynıdır
     * (kliniğe atanmış aktif `Veteriner`): hekim listesinde bulunup bulunmamaya bakılır. Liste alınamazsa `null`
     * (süzgeç gizlenir, tüm liste gösterilir).
     */
    getCurrentVeterinarianUserId(): Observable<string | null> {
        const userId = this.auth.getUserId()?.trim().toLowerCase();
        const clinicId = this.auth.getClinicId()?.trim();
        if (!userId || !clinicId) {
            return of(null);
        }
        return this.getVeterinarians(clinicId).pipe(
            map((vets) => findVeterinarianUserId(vets, userId)),
            catchError(() => of(null))
        );
    }

    /**
     * `201` yeni kayıt, `200` mevcut açık Visit (`created: false`); ikisi de başarıdır.
     * Aynı hasta/randevu için tekrar istek ikinci Visit üretmez.
     */
    createVisit(request: CreateVisitRequest): Observable<VisitCreateResultVm> {
        return this.api.post<VisitCreateResultDto>(ApiEndpoints.visits.create(), mapCreateVisitToApiBody(request)).pipe(
            map(mapVisitCreateResultDtoToVm),
            toUserError('Geliş kaydı oluşturulamadı.')
        );
    }

    /** `Waiting → InProgress`; zaten hedef durumdaysa sunucu `200` ve mevcut kaydı döner. */
    startVisit(id: string): Observable<VisitVm> {
        return this.api.post<VisitDto>(ApiEndpoints.visits.start(id), {}).pipe(
            map(mapVisitDtoToVm),
            toUserError('Bakım başlatılamadı.')
        );
    }

    /** `InProgress → Completed`; ödeme eksikliği geçişi engellemez. */
    completeVisit(id: string): Observable<VisitVm> {
        return this.api.post<VisitDto>(ApiEndpoints.visits.complete(id), {}).pipe(
            map(mapVisitDtoToVm),
            toUserError('Bakım tamamlanamadı.')
        );
    }

    /** `Visits.Correct`; gerekçe zorunlu, sunucuda audit'e yazılır. */
    correctVisit(id: string, request: CorrectVisitRequest): Observable<VisitVm> {
        return this.api.post<VisitDto>(ApiEndpoints.visits.corrections(id), mapCorrectVisitToApiBody(request)).pipe(
            map(mapVisitDtoToVm),
            toUserError('Düzeltme kaydedilemedi.')
        );
    }

    /** `Visits.Update`; idempotent. Tamamlanmış kayıtta değişim `Visits.NotOpen` (409). */
    setUrgency(id: string, isUrgent: boolean): Observable<VisitVm> {
        return this.api.put<VisitDto>(ApiEndpoints.visits.urgency(id), mapUrgencyToApiBody(isUrgent)).pipe(
            map(mapVisitDtoToVm),
            toUserError('Acil işareti güncellenemedi.')
        );
    }

    /** `Visits.Correct`; yanlış geliş işaretini kaldırır, gerekçe zorunlu. Çakışmada 409 döner. */
    restoreVisit(id: string, reason: string): Observable<VisitVm> {
        return this.api.post<VisitDto>(ApiEndpoints.visits.restore(id), mapRestoreVisitToApiBody(reason)).pipe(
            map(mapVisitDtoToVm),
            toUserError('Geri alma kaydedilemedi.')
        );
    }
}

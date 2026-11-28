import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapClinicAiSettingsDtoToVm } from '@/app/entities/ai/data/ai.mapper';
import type { ClinicAiSettingsDto, ClinicAiSettingsUpdateDto } from '@/app/entities/ai/models/ai-api.model';
import type { ClinicAiSettingsVm } from '@/app/entities/ai/models/ai-vm.model';
import { messageFromHttpError, type ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Klinik AI ayarı hata kodları (`AI_HISTORY_SUMMARY_API_CONTRACT.md` §3a) → kullanıcı mesajı. */
const CLINIC_AI_SETTINGS_PROBLEM_MESSAGES: ProblemMessages = {
    'Ai.AcknowledgementRequired': 'Bilgilendirme metni güncellenmiş; sayfayı yenileyip yeniden kabul edin.',
    'Clinics.NotFound': 'Klinik bulunamadı.',
    'Clinics.AccessDenied': 'Bu klinik için yetkiniz yok.'
};

function toClinicAiSettingsError<T>(fallback: string) {
    return catchError<T, Observable<never>>((err: unknown) =>
        throwError(() => (err instanceof HttpErrorResponse ? new Error(messageFromHttpError(err, fallback, CLINIC_AI_SETTINGS_PROBLEM_MESSAGES)) : err))
    );
}

/** Klinik ayarlarındaki yapay zekâ (ADR-044 E1): okuma `Clinics.Read`, aç/kapa `Clinics.Update`. */
@Injectable({ providedIn: 'root' })
export class ClinicAiSettingsService {
    private readonly api = inject(ApiClient);

    get(clinicId: string): Observable<ClinicAiSettingsVm> {
        return this.api.get<ClinicAiSettingsDto>(ApiEndpoints.clinics.aiSettings(clinicId)).pipe(map(mapClinicAiSettingsDtoToVm), toClinicAiSettingsError('Yapay zekâ ayarı yüklenemedi.'));
    }

    /** Açarken bilgilendirme bu klinikte henüz kabul edilmediyse gösterilen sürüm gönderilir. */
    save(clinicId: string, isEnabled: boolean, acknowledgementVersion?: number): Observable<ClinicAiSettingsVm> {
        const body: ClinicAiSettingsUpdateDto = acknowledgementVersion ? { isEnabled, acknowledgementVersion } : { isEnabled };

        return this.api.put<ClinicAiSettingsDto>(ApiEndpoints.clinics.aiSettings(clinicId), body).pipe(map(mapClinicAiSettingsDtoToVm), toClinicAiSettingsError('Yapay zekâ ayarı kaydedilemedi.'));
    }
}

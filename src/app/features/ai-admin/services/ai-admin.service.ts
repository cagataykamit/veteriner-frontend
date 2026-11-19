import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, MonoTypeOperatorFunction, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { AiAdminClinicDto, AiAdminUsageDto, AiFundGrantDto } from '@/app/features/ai-admin/models/ai-admin.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const AI_ADMIN_PROBLEM_MESSAGES: Record<string, string> = {
    'Ai.ClinicNotFound': 'Klinik bulunamadı.',
    'Ai.Validation': 'Arama en az 2 karakter olmalıdır.'
};

function toAiAdminError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        return throwError(() => new Error(messageFromHttpError(err, fallback, AI_ADMIN_PROBLEM_MESSAGES)));
    });
}

/** Platform yöneticisi: klinik bazında AI aç/kapat, fon ekleme, aylık kullanım ve tahmini maliyet. */
@Injectable({ providedIn: 'root' })
export class AiAdminService {
    private readonly api = inject(ApiClient);

    /** `month` yoksa bu ay. */
    usage(month?: string | null): Observable<AiAdminUsageDto> {
        const params = month ? new HttpParams().set('month', month) : undefined;

        return this.api.get<AiAdminUsageDto>(ApiEndpoints.aiAdmin.usage(), params).pipe(toAiAdminError('Yapay zekâ kullanımı yüklenemedi.'));
    }

    /** Arama yoksa AI ayarı olan klinikler; varsa klinik ya da kurum adına uyan en çok 50 klinik. */
    clinics(search?: string | null): Observable<AiAdminClinicDto[]> {
        const term = search?.trim();
        const params = term ? new HttpParams().set('search', term) : undefined;

        return this.api.get<AiAdminClinicDto[]>(ApiEndpoints.aiAdmin.clinics(), params).pipe(toAiAdminError('Klinikler yüklenemedi.'));
    }

    setEnabled(clinicId: string, isEnabled: boolean): Observable<AiAdminClinicDto> {
        return this.api.put<AiAdminClinicDto>(ApiEndpoints.aiAdmin.clinic(clinicId), { isEnabled }).pipe(toAiAdminError('Klinik ayarı kaydedilemedi.'));
    }

    fundGrants(clinicId: string): Observable<AiFundGrantDto[]> {
        return this.api.get<AiFundGrantDto[]>(ApiEndpoints.aiAdmin.fundGrants(clinicId)).pipe(toAiAdminError('Fon hareketleri yüklenemedi.'));
    }

    /** Elle fon ekler (1–100.000 kredi); geri alınmaz. */
    grantFund(clinicId: string, credits: number, note: string | null): Observable<AiAdminClinicDto> {
        return this.api.post<AiAdminClinicDto>(ApiEndpoints.aiAdmin.fundGrants(clinicId), { credits, note }).pipe(toAiAdminError('Fon eklenemedi.'));
    }
}

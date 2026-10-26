import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import type { ExampleClinicDataCountsDto, ExampleClinicLoadSummaryDto, ExampleClinicStatusDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export const EXAMPLE_CLINIC_ALREADY_LOADED_CODE = 'Tenants.ExampleClinicAlreadyLoaded' as const;
export const EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE = 'Tenants.ExampleClinicTrialRequired' as const;
export const EXAMPLE_CLINIC_NOT_LOADED_CODE = 'Tenants.ExampleClinicNotLoaded' as const;

/** `/tenants/{tenantId}/example-clinic` — `EXAMPLE_CLINIC_API_CONTRACT.md` §4 (yükleme) ve §10 (durum, temizlik). */
const EXAMPLE_CLINIC_PROBLEM_MESSAGES: Record<string, string> = {
    [EXAMPLE_CLINIC_ALREADY_LOADED_CODE]: 'Kurumunuzda zaten müşteri ya da hasta kaydı var; örnek klinik yalnız boş kuruma yüklenebilir.',
    [EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE]: 'Örnek klinik yalnız deneme süresinde yüklenebilir.',
    [EXAMPLE_CLINIC_NOT_LOADED_CODE]: 'Kurumunuzda temizlenecek örnek veri kalmamış.',
    'Subscriptions.TenantReadOnly': 'Aboneliğiniz salt okunur modda; örnek veri temizlenemez.',
    'Subscriptions.TenantCancelled': 'Aboneliğiniz iptal edilmiş; örnek veri temizlenemez.',
    'Tenants.AccessDenied': 'Bu kuruma erişim yetkiniz bulunmuyor.',
    'Tenants.NotFound': 'Kurum kaydı bulunamadı.',
    'Clinics.NotFound': 'Kurumun aktif kliniği bulunamadı.',
    'Tenants.ContextMissing': 'Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'
};

const TENANT_MISSING_MESSAGE = 'Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.';

/** Örnek klinik isteği hatası: problem kodu korunur ki ekran 409 durumuna göre eylemi gizleyebilsin ya da durumu yenileyebilsin. */
export class ExampleClinicError extends Error {
    constructor(
        message: string,
        readonly code: string | null
    ) {
        super(message);
        this.name = 'ExampleClinicError';
    }

    /** Yüklemeyi tekrar denemenin anlamı yok: kurum dolu ya da deneme dışı. */
    get isBlocking(): boolean {
        return this.code === EXAMPLE_CLINIC_ALREADY_LOADED_CODE || this.code === EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE;
    }

    /** Temizlenecek örnek veri yok (ikinci temizlik ya da başka sekmede silindi): durum yenilenir. */
    get isNotLoaded(): boolean {
        return this.code === EXAMPLE_CLINIC_NOT_LOADED_CODE;
    }
}

/** Örnek Veteriner Kliniği: sonradan yükleme (ADR-002, TRIAL-002), durum ve kalıcı temizlik (sözleşme §10). */
@Injectable({ providedIn: 'root' })
export class ExampleClinicService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    load(): Observable<ExampleClinicLoadSummaryDto> {
        return this.request((tenantId) => this.api.post<ExampleClinicLoadSummaryDto>(ApiEndpoints.tenants.exampleClinic(tenantId), {}), 'Örnek klinik yüklenemedi.');
    }

    getStatus(): Observable<ExampleClinicStatusDto> {
        return this.request((tenantId) => this.api.get<ExampleClinicStatusDto>(ApiEndpoints.tenants.exampleClinic(tenantId)), 'Örnek klinik durumu okunamadı.');
    }

    clear(): Observable<ExampleClinicDataCountsDto> {
        return this.request((tenantId) => this.api.delete<ExampleClinicDataCountsDto>(ApiEndpoints.tenants.exampleClinic(tenantId)), 'Örnek veri temizlenemedi.');
    }

    private request<T>(send: (tenantId: string) => Observable<T>, fallback: string): Observable<T> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        if (!tenantId) {
            return throwError(() => new ExampleClinicError(TENANT_MISSING_MESSAGE, null));
        }

        return send(tenantId).pipe(
            catchError((err: unknown) => {
                if (!(err instanceof HttpErrorResponse)) {
                    return throwError(() => new ExampleClinicError(err instanceof Error ? err.message : fallback, null));
                }

                const code = problemCodeFromHttpError(err);

                return throwError(() => new ExampleClinicError((code && EXAMPLE_CLINIC_PROBLEM_MESSAGES[code]) || messageFromHttpError(err, fallback), code));
            })
        );
    }
}

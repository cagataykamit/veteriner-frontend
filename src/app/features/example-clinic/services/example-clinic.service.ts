import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import type { ExampleClinicLoadSummaryDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export const EXAMPLE_CLINIC_ALREADY_LOADED_CODE = 'Tenants.ExampleClinicAlreadyLoaded' as const;
export const EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE = 'Tenants.ExampleClinicTrialRequired' as const;

/** `POST /tenants/{tenantId}/example-clinic` — `EXAMPLE_CLINIC_API_CONTRACT.md` §4. */
const EXAMPLE_CLINIC_PROBLEM_MESSAGES: Record<string, string> = {
    [EXAMPLE_CLINIC_ALREADY_LOADED_CODE]: 'Kurumunuzda zaten müşteri ya da hasta kaydı var; örnek klinik yalnız boş kuruma yüklenebilir.',
    [EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE]: 'Örnek klinik yalnız deneme süresinde yüklenebilir.',
    'Tenants.AccessDenied': 'Bu kuruma erişim yetkiniz bulunmuyor.',
    'Tenants.NotFound': 'Kurum kaydı bulunamadı.',
    'Clinics.NotFound': 'Kurumun aktif kliniği bulunamadı.',
    'Tenants.ContextMissing': 'Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.'
};

/** Yükleme hatası: problem kodu korunur ki ekran 409 durumunda eylemi gizleyebilsin. */
export class ExampleClinicLoadError extends Error {
    constructor(
        message: string,
        readonly code: string | null
    ) {
        super(message);
        this.name = 'ExampleClinicLoadError';
    }

    /** Tekrar denemenin anlamı yok: kurum dolu ya da deneme dışı. */
    get isBlocking(): boolean {
        return this.code === EXAMPLE_CLINIC_ALREADY_LOADED_CODE || this.code === EXAMPLE_CLINIC_TRIAL_REQUIRED_CODE;
    }
}

/** Boş başlayan deneme kiracısına Örnek Veteriner Kliniğini sonradan yükler (ADR-002, TRIAL-002). */
@Injectable({ providedIn: 'root' })
export class ExampleClinicService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    load(): Observable<ExampleClinicLoadSummaryDto> {
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        if (!tenantId) {
            return throwError(() => new ExampleClinicLoadError('Kurum bilgisi okunamadı. Lütfen yeniden giriş yapın.', null));
        }

        return this.api.post<ExampleClinicLoadSummaryDto>(ApiEndpoints.tenants.exampleClinic(tenantId), {}).pipe(
            catchError((err: unknown) => {
                if (!(err instanceof HttpErrorResponse)) {
                    return throwError(() => new ExampleClinicLoadError(err instanceof Error ? err.message : 'Örnek klinik yüklenemedi.', null));
                }

                const code = problemCodeFromHttpError(err);

                return throwError(() => new ExampleClinicLoadError((code && EXAMPLE_CLINIC_PROBLEM_MESSAGES[code]) || messageFromHttpError(err, 'Örnek klinik yüklenemedi.'), code));
            })
        );
    }
}

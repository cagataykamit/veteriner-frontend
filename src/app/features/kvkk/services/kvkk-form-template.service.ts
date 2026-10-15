import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { kvkkFormTemplateToPutBody, mapKvkkFormTemplateDtoToVm } from '@/app/features/kvkk/data/kvkk-form-template.mapper';
import type { KvkkFormTemplateDto, KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import type { KvkkTemplateKind } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const TEMPLATE_URL: Readonly<Record<KvkkTemplateKind, (clinicId: string) => string>> = {
    consent: ApiEndpoints.clinics.kvkkFormTemplate,
    disclosure: ApiEndpoints.clinics.kvkkDisclosureTemplate
};

/**
 * Klinik başına KVKK şablonları: açık rıza formu (`KVKK_CONSENT_API_CONTRACT.md` §2) ve aydınlatma metni (§2b). İkisi aynı sözleşmeyi
 * paylaşır, yalnız yol farklıdır; kayıt yoksa sunucu taslak varsayılanı döner.
 */
@Injectable({ providedIn: 'root' })
export class KvkkFormTemplateService {
    private readonly api = inject(ApiClient);

    /** Okuma: `Clinics.Read` | `Clinics.Update` | `Clients.Read` (formu yazdıran ve metni düzenleyen aynı metni okur). */
    getTemplate(clinicId: string, kind: KvkkTemplateKind): Observable<KvkkFormTemplateVm> {
        return this.api.get<KvkkFormTemplateDto>(TEMPLATE_URL[kind](clinicId)).pipe(
            map(mapKvkkFormTemplateDtoToVm),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'KVKK metni yüklenemedi.'))))
        );
    }

    /** `Clinics.Update`. HTTP hatası ham iletilir: 409 `Clinics.KvkkFormTemplate.ConcurrencyConflict` çağıranda yeniden yükleme gerektirir. */
    updateTemplate(clinicId: string, kind: KvkkTemplateKind, text: string, current: Pick<KvkkFormTemplateVm, 'isDefault' | 'rowVersion'>): Observable<KvkkFormTemplateVm> {
        return this.api.put<KvkkFormTemplateDto>(TEMPLATE_URL[kind](clinicId), kvkkFormTemplateToPutBody(text, current)).pipe(map(mapKvkkFormTemplateDtoToVm));
    }
}

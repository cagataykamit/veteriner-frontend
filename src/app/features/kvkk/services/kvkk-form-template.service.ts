import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { kvkkFormTemplateToPutBody, mapKvkkFormTemplateDtoToVm } from '@/app/features/kvkk/data/kvkk-form-template.mapper';
import type { KvkkFormTemplateDto, KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Klinik başına KVKK açık rıza formu şablonu (`KVKK_CONSENT_API_CONTRACT.md` §2); kayıt yoksa sunucu varsayılanı döner. */
@Injectable({ providedIn: 'root' })
export class KvkkFormTemplateService {
    private readonly api = inject(ApiClient);

    /** Okuma: `Clinics.Read` | `Clinics.Update` | `Clients.Read` (formu yazdıran ve metni düzenleyen aynı metni okur). */
    getTemplate(clinicId: string): Observable<KvkkFormTemplateVm> {
        return this.api.get<KvkkFormTemplateDto>(ApiEndpoints.clinics.kvkkFormTemplate(clinicId)).pipe(
            map(mapKvkkFormTemplateDtoToVm),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'KVKK form metni yüklenemedi.'))))
        );
    }

    /** `Clinics.Update`. HTTP hatası ham iletilir: 409 `Clinics.KvkkFormTemplate.ConcurrencyConflict` çağıranda yeniden yükleme gerektirir. */
    updateTemplate(clinicId: string, text: string, current: Pick<KvkkFormTemplateVm, 'isDefault' | 'rowVersion'>): Observable<KvkkFormTemplateVm> {
        return this.api
            .put<KvkkFormTemplateDto>(ApiEndpoints.clinics.kvkkFormTemplate(clinicId), kvkkFormTemplateToPutBody(text, current))
            .pipe(map(mapKvkkFormTemplateDtoToVm));
    }
}

import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import type {
    EDocumentConnectionDto,
    EDocumentDto,
    EDocumentListItemDto,
    EDocumentPreviewDto,
    EDocumentSource,
    EDocumentStatus,
    EDocumentType,
    PagedDto,
    UndocumentedChargeDto
} from '@/app/entities/e-document/models/e-document.model';
import { fileNameFromContentDisposition } from '@/app/shared/utils/file-download.utils';

export interface EDocumentsListQuery {
    page: number;
    pageSize: number;
    clientId?: string | null;
    status?: EDocumentStatus | null;
    documentType?: EDocumentType | null;
}

/**
 * e-belge uçları (`E_DOCUMENTS_API_CONTRACT.md`). HTTP hataları bileşende `panelHttpFailureMessage` ile ayrıştırılsın diye ham
 * iletilir (eksik alıcı alanı gibi `extensions` okunabilsin). Klinik verilmezse aktif klinik kullanılır.
 */
@Injectable({ providedIn: 'root' })
export class EDocumentsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    preview(source: EDocumentSource): Observable<EDocumentPreviewDto> {
        return this.api.post<EDocumentPreviewDto>(ApiEndpoints.eDocuments.preview(), { clinicId: this.clinicId(), ...source });
    }

    /** `requestId` çağıran tarafından bir kez üretilir; tekrar denemede aynı değer gider (çift belge oluşmaz). */
    issue(source: EDocumentSource, requestId: string, note?: string | null): Observable<EDocumentDto> {
        return this.api.post<EDocumentDto>(ApiEndpoints.eDocuments.list(), { requestId, clinicId: this.clinicId(), note: note?.trim() || null, ...source });
    }

    list(query: EDocumentsListQuery): Observable<PagedDto<EDocumentListItemDto>> {
        let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
        const clinicId = this.clinicId();

        if (clinicId) {
            params = params.set('clinicId', clinicId);
        }

        if (query.clientId) {
            params = params.set('clientId', query.clientId);
        }

        if (query.status) {
            params = params.set('status', query.status);
        }

        if (query.documentType) {
            params = params.set('documentType', query.documentType);
        }

        return this.api.get<PagedDto<EDocumentListItemDto>>(ApiEndpoints.eDocuments.list(), params);
    }

    undocumentedCharges(page: number, pageSize: number, clientId?: string | null): Observable<PagedDto<UndocumentedChargeDto>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        const clinicId = this.clinicId();

        if (clinicId) {
            params = params.set('clinicId', clinicId);
        }

        if (clientId) {
            params = params.set('clientId', clientId);
        }

        return this.api.get<PagedDto<UndocumentedChargeDto>>(ApiEndpoints.eDocuments.undocumentedCharges(), params);
    }

    get(id: string): Observable<EDocumentDto> {
        return this.api.get<EDocumentDto>(ApiEndpoints.eDocuments.byId(id));
    }

    refresh(id: string): Observable<EDocumentDto> {
        return this.api.post<EDocumentDto>(ApiEndpoints.eDocuments.refresh(id), {});
    }

    retry(id: string): Observable<EDocumentDto> {
        return this.api.post<EDocumentDto>(ApiEndpoints.eDocuments.retry(id), {});
    }

    discard(id: string, reason: string): Observable<EDocumentDto> {
        return this.api.post<EDocumentDto>(ApiEndpoints.eDocuments.discard(id), { reason: reason.trim() });
    }

    cancel(id: string, reason: string): Observable<EDocumentDto> {
        return this.api.post<EDocumentDto>(ApiEndpoints.eDocuments.cancel(id), { reason: reason.trim() });
    }

    /** PDF sağlayıcıdan alınır; hazır değilse 409 `EDocuments.PdfNotReady`. */
    pdf(id: string): Observable<{ blob: Blob; fileName: string }> {
        return this.api.getBlob(ApiEndpoints.eDocuments.pdf(id)).pipe(
            map((response) => ({
                blob: response.body ?? new Blob([], { type: 'application/pdf' }),
                fileName: fileNameFromContentDisposition(response.headers.get('content-disposition')) ?? `e-belge-${id}.pdf`
            }))
        );
    }

    getConnection(clinicId: string): Observable<EDocumentConnectionDto> {
        return this.api.get<EDocumentConnectionDto>(ApiEndpoints.clinics.eDocumentConnection(clinicId));
    }

    authorize(clinicId: string, provider: string): Observable<string> {
        return this.api
            .post<{ authorizationUrl: string }>(ApiEndpoints.clinics.eDocumentConnectionAuthorize(clinicId), { provider })
            .pipe(map((r) => r.authorizationUrl));
    }

    selectAccount(clinicId: string, accountId: string): Observable<EDocumentConnectionDto> {
        return this.api.put<EDocumentConnectionDto>(ApiEndpoints.clinics.eDocumentConnectionAccount(clinicId), { accountId });
    }

    verify(clinicId: string): Observable<EDocumentConnectionDto> {
        return this.api.post<EDocumentConnectionDto>(ApiEndpoints.clinics.eDocumentConnectionVerify(clinicId), {});
    }

    disconnect(clinicId: string): Observable<void> {
        return this.api.delete<void>(ApiEndpoints.clinics.eDocumentConnection(clinicId));
    }

    private clinicId(): string | null {
        return this.auth.getClinicId()?.trim() || null;
    }
}

import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { LegalDocumentVersionDto, MyLegalAcceptanceStatusDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';

/** Sürümlü hukuki kabul (ADR-029). Sürümlerin tek kaynağı backend'dir; istemci sürüm numarası tutmaz. */
@Injectable({ providedIn: 'root' })
export class LegalAcceptanceService {
    private readonly api = inject(ApiClient);

    private currentVersions$: Observable<LegalDocumentVersionDto[]> | null = null;

    /** Anonim; oturum boyunca bir kez okunur (hata olursa sonraki çağrı yeniden dener). */
    getCurrentVersions(): Observable<LegalDocumentVersionDto[]> {
        this.currentVersions$ ??= this.api.get<LegalDocumentVersionDto[]>(ApiEndpoints.public.legalDocuments()).pipe(
            catchError((err: unknown) => {
                this.currentVersions$ = null;

                return throwError(() => err);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.currentVersions$;
    }

    /** Sunucu sürümü değiştiyse (409) önbellek bırakılır. */
    refreshCurrentVersions(): Observable<LegalDocumentVersionDto[]> {
        this.currentVersions$ = null;

        return this.getCurrentVersions();
    }

    getMyStatus(): Observable<MyLegalAcceptanceStatusDto> {
        return this.api.get<MyLegalAcceptanceStatusDto>(ApiEndpoints.me.legalAcceptances());
    }

    /** Gösterilen belgeleri ve sürümleri gönderir; HTTP hatası ham iletilir (409 için {@link isLegalVersionOutdatedError}). */
    accept(documents: readonly LegalDocumentVersionDto[]): Observable<MyLegalAcceptanceStatusDto> {
        return this.api.post<MyLegalAcceptanceStatusDto>(ApiEndpoints.me.legalAcceptances(), {
            documents: documents.map(({ documentType, version }) => ({ documentType, version }))
        });
    }
}

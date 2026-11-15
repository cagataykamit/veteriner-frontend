import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap, throwError, timeout } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { LegalDocumentVersionDto, MyLegalAcceptanceStatusDto } from '@/app/entities/legal-document/models/legal-acceptance.model';

/** Panel açılışında kabul durumu en çok bu kadar beklenir; sonra panel açılır, pencere durum gelince çıkar. */
const MY_STATUS_PREFETCH_TIMEOUT_MS = 3000;

/** Sürümlü hukuki kabul (ADR-029). Sürümlerin tek kaynağı backend'dir; istemci sürüm numarası tutmaz. */
@Injectable({ providedIn: 'root' })
export class LegalAcceptanceService {
    private readonly api = inject(ApiClient);

    private currentVersions$: Observable<LegalDocumentVersionDto[]> | null = null;
    private prefetchedStatus: MyLegalAcceptanceStatusDto | null = null;

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

    /** Panel rotası çözülürken bir kez okunur (`legalStatusResolver`); hata ya da gecikme paneli engellemez. */
    prefetchMyStatus(): Observable<true> {
        this.prefetchedStatus = null;

        return this.getMyStatus().pipe(
            timeout({ first: MY_STATUS_PREFETCH_TIMEOUT_MS }),
            tap((status) => (this.prefetchedStatus = status)),
            map(() => true as const),
            catchError(() => of(true as const))
        );
    }

    /** Önceden okunmuş durum (bir kez verilir); yoksa `null` ve kabul penceresi kendisi okur. */
    takePrefetchedStatus(): MyLegalAcceptanceStatusDto | null {
        const status = this.prefetchedStatus;

        this.prefetchedStatus = null;

        return status;
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

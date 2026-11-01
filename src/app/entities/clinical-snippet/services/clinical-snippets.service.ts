import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, shareReplay, tap, throwError, type MonoTypeOperatorFunction } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLINICAL_SNIPPET_LIMIT,
    type ClinicalSnippetDto,
    type ClinicalSnippetPagedResultDto,
    type ClinicalSnippetsListQuery,
    type ClinicalSnippetUpsertRequest
} from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export const CLINICAL_SNIPPET_CONCURRENCY_CONFLICT_CODE = 'ClinicalSnippets.ConcurrencyConflict';

const CLINICAL_SNIPPET_PROBLEM_MESSAGES: Record<string, string> = {
    'ClinicalSnippets.DuplicateShortcut': 'Bu kısayol zaten kullanılıyor (pasif parçalar dahil). Farklı bir kısayol yazın ya da "Pasifleri göster" ile pasif parçayı bulup etkinleştirin.',
    'ClinicalSnippets.LimitReached': 'En fazla 200 metin parçası tanımlanabilir (pasifler dahil). Kullanmadığınız bir parçayı düzenleyerek yeniden kullanın.',
    [CLINICAL_SNIPPET_CONCURRENCY_CONFLICT_CODE]: 'Parça bu arada değişmiş; liste yenilendi, tekrar deneyin.',
    'ClinicalSnippets.NotFound': 'Metin parçası bulunamadı.',
    'ClinicalSnippets.RouteIdMismatch': 'İstek tutarsız; sayfayı yenileyip tekrar deneyin.'
};

/** Kullanıcıya gösterilecek mesaj + sunucu kodu (eşzamanlılık çakışmasında liste yenilenir). */
export class ClinicalSnippetError extends Error {
    constructor(
        message: string,
        readonly code: string | null
    ) {
        super(message);
    }

    get isConflict(): boolean {
        return this.code === CLINICAL_SNIPPET_CONCURRENCY_CONFLICT_CODE;
    }
}

function toClinicalSnippetError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const message = messageFromHttpError(err, fallback, CLINICAL_SNIPPET_PROBLEM_MESSAGES);

        return throwError(() => new ClinicalSnippetError(message, problemCodeFromHttpError(err)));
    });
}

function listQueryToHttpParams(q: ClinicalSnippetsListQuery): HttpParams {
    let p = new HttpParams();
    const search = q.search?.trim();

    if (search) {
        p = p.set('search', search);
    }

    if (q.includeInactive) {
        p = p.set('includeInactive', 'true');
    }

    if (q.page) {
        p = p.set('page', String(q.page));
    }

    if (q.pageSize) {
        p = p.set('pageSize', String(q.pageSize));
    }

    return p;
}

/** Klinik metin parçaları (EXAM-011/012): muayene metin alanında `#` seçicisinin kaynağı ve Tanımlar altındaki yönetim. */
@Injectable({ providedIn: 'root' })
export class ClinicalSnippetsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /**
     * Seçicinin aktif listesi; oturum boyunca paylaşılır, yazma sonrası düşer. Liste kiracınındır; seçili klinik değişince
     * (oturum/klinik değişimi) yeniden çekilir. Hata önbelleğe alınmaz (sonraki çağrı yeniden dener).
     */
    private active$: Observable<ClinicalSnippetDto[]> | null = null;
    private activeSessionKey: string | null = null;

    list(query: ClinicalSnippetsListQuery): Observable<ClinicalSnippetPagedResultDto> {
        return this.api
            .get<ClinicalSnippetPagedResultDto>(ApiEndpoints.clinicalSnippets.list(), listQueryToHttpParams(query))
            .pipe(toClinicalSnippetError('Metin parçaları yüklenemedi.'));
    }

    /** Tüm aktif parçalar tek istekte (tavan 200 = en büyük sayfa); istemcide süzülür. */
    activeSnippets(): Observable<ClinicalSnippetDto[]> {
        const sessionKey = this.auth.getClinicId() ?? '';

        if (!this.active$ || this.activeSessionKey !== sessionKey) {
            this.activeSessionKey = sessionKey;
            this.active$ = this.list({ page: 1, pageSize: CLINICAL_SNIPPET_LIMIT }).pipe(
                map((r) => r.items),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }

        return this.active$;
    }

    create(request: ClinicalSnippetUpsertRequest): Observable<ClinicalSnippetDto> {
        return this.api.post<ClinicalSnippetDto>(ApiEndpoints.clinicalSnippets.list(), request).pipe(
            tap(() => this.invalidateActive()),
            toClinicalSnippetError('Metin parçası kaydedilemedi.')
        );
    }

    update(id: string, request: ClinicalSnippetUpsertRequest, rowVersion: string): Observable<ClinicalSnippetDto> {
        return this.api.put<ClinicalSnippetDto>(ApiEndpoints.clinicalSnippets.byId(id), { ...request, rowVersion }).pipe(
            tap(() => this.invalidateActive()),
            toClinicalSnippetError('Metin parçası güncellenemedi.')
        );
    }

    setActive(id: string, active: boolean): Observable<void> {
        const path = active ? ApiEndpoints.clinicalSnippets.activate(id) : ApiEndpoints.clinicalSnippets.deactivate(id);

        return this.api.post<unknown>(path, {}).pipe(
            map(() => undefined),
            tap(() => this.invalidateActive()),
            toClinicalSnippetError(active ? 'Metin parçası etkinleştirilemedi.' : 'Metin parçası pasifleştirilemedi.')
        );
    }

    private invalidateActive(): void {
        this.active$ = null;
    }
}

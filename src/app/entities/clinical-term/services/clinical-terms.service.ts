import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError, type MonoTypeOperatorFunction } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ClinicalTermDto,
    ClinicalTermKind,
    ClinicalTermPagedResultDto,
    ClinicalTermsListQuery
} from '@/app/entities/clinical-term/models/clinical-term.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const CONCURRENCY_CONFLICT_CODE = 'ClinicalTerms.ConcurrencyConflict';
const DUPLICATE_NAME_CODE = 'ClinicalTerms.DuplicateName';

const CLINICAL_TERM_PROBLEM_MESSAGES: Record<string, string> = {
    [DUPLICATE_NAME_CODE]: 'Bu ad sözlükte zaten var (pasif kayıtlar dahil). Pasif kaydı etkinleştirin veya farklı bir ad yazın.',
    [CONCURRENCY_CONFLICT_CODE]: 'Kayıt bu arada değişmiş; liste yenilendi, tekrar deneyin.',
    'ClinicalTerms.SystemTermReadOnly': 'Sistem terimleri değiştirilemez.',
    'ClinicalTerms.NotFound': 'Terim bulunamadı.'
};

/**
 * Kullanıcıya gösterilecek mesaj + eşzamanlılık çakışması bilgisi (çakışmada liste yenilenir) + mükerrer ad bilgisi
 * (aynı tür + ad sözlükte, pasifler dahil, zaten var).
 */
export class ClinicalTermError extends Error {
    constructor(
        message: string,
        readonly isConflict: boolean,
        readonly isDuplicateName = false
    ) {
        super(message);
    }
}

function toClinicalTermError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);
        const message = (code && CLINICAL_TERM_PROBLEM_MESSAGES[code]) || messageFromHttpError(err, fallback);

        return throwError(() => new ClinicalTermError(message, code === CONCURRENCY_CONFLICT_CODE, code === DUPLICATE_NAME_CODE));
    });
}

function listQueryToHttpParams(q: ClinicalTermsListQuery): HttpParams {
    let p = new HttpParams();

    if (q.kind) {
        p = p.set('kind', q.kind);
    }

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

/** Tanı/şikâyet sözlüğü (ADR-020 S3): muayene alanları için arama kaynağı ve Tanımlar altındaki yönetim. */
@Injectable({ providedIn: 'root' })
export class ClinicalTermsService {
    private readonly api = inject(ApiClient);

    list(query: ClinicalTermsListQuery): Observable<ClinicalTermPagedResultDto> {
        return this.api
            .get<ClinicalTermPagedResultDto>(ApiEndpoints.clinicalTerms.list(), listQueryToHttpParams(query))
            .pipe(toClinicalTermError('Sözlük yüklenemedi.'));
    }

    create(kind: ClinicalTermKind, name: string): Observable<ClinicalTermDto> {
        return this.api
            .post<ClinicalTermDto>(ApiEndpoints.clinicalTerms.list(), { kind, name: name.trim() })
            .pipe(toClinicalTermError('Terim sözlüğe eklenemedi.'));
    }

    rename(id: string, name: string, rowVersion: string): Observable<ClinicalTermDto> {
        return this.api
            .put<ClinicalTermDto>(ApiEndpoints.clinicalTerms.byId(id), { name: name.trim(), rowVersion })
            .pipe(toClinicalTermError('Terim güncellenemedi.'));
    }

    setActive(id: string, active: boolean): Observable<void> {
        const path = active ? ApiEndpoints.clinicalTerms.activate(id) : ApiEndpoints.clinicalTerms.deactivate(id);

        return this.api.post<unknown>(path, {}).pipe(
            map(() => undefined),
            toClinicalTermError(active ? 'Terim etkinleştirilemedi.' : 'Terim pasifleştirilemedi.')
        );
    }
}

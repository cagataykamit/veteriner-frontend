import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError, type MonoTypeOperatorFunction } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ExaminationTemplateApplyResultDto,
    ExaminationTemplateDto,
    ExaminationTemplatePagedResultDto,
    ExaminationTemplatesListQuery,
    ExaminationTemplateUpsertRequest
} from '@/app/entities/examination-template/models/examination-template.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export const TEMPLATE_CONCURRENCY_CONFLICT_CODE = 'ExaminationTemplates.ConcurrencyConflict';
export const EXAMINATION_CONCURRENCY_CONFLICT_CODE = 'Examinations.ConcurrencyConflict';
export const EXAMINATION_FINALIZED_CODE = 'Examinations.Finalized';

/** Şablon ve uygulama kodlarının Türkçe karşılığı; `Administrations.*` ve diğerleri genel eşlemeden (`messageFromHttpError`) gelir. */
const EXAMINATION_TEMPLATE_PROBLEM_MESSAGES: Record<string, string> = {
    'ExaminationTemplates.DuplicateName': 'Bu adla bir şablon zaten var (sistem ve pasif şablonlar dahil). Farklı bir ad yazın.',
    [TEMPLATE_CONCURRENCY_CONFLICT_CODE]: 'Şablon bu arada değişmiş; liste yenilendi, tekrar deneyin.',
    'ExaminationTemplates.SystemTemplateReadOnly': 'Sistem şablonları değiştirilemez; "Kopyala ve düzenle" ile kendi şablonunuzu oluşturun.',
    'ExaminationTemplates.VaccineNotAllowed': 'Aşı ürünü şablona eklenemez; aşı, aşı kaydı ekranından girilir.',
    'ExaminationTemplates.ProductInactive': 'Ürün pasif; satırı çıkarın veya ürünü etkinleştirin.',
    'ExaminationTemplates.Inactive': 'Şablon pasifleştirilmiş; uygulanamaz. Listeden başka bir şablon seçin.',
    'ExaminationTemplates.NotFound': 'Şablon bulunamadı.',
    [EXAMINATION_FINALIZED_CODE]: 'Bu muayene kesinleştirilmiş; şablon uygulanamaz. İşlem gerekiyorsa sonradan ekleme akışını kullanın.',
    [EXAMINATION_CONCURRENCY_CONFLICT_CODE]: 'Muayene bu arada değişmiş; güncel kayıt yüklendi. Ön izlemeyi kontrol edip tekrar uygulayın.',
    'Examinations.TemplateTextTooLong': 'Şablon metni eklenince muayene metni sınırı aşılıyor; ilgili alanı kısaltıp tekrar deneyin.',
    'Products.NotFound': 'Ürün katalogda bulunamadı.'
};

/** Kullanıcıya gösterilecek mesaj + sunucu kodu + reddedilen satırın ürünü (ProblemDetails `productId`). */
export class ExaminationTemplateError extends Error {
    constructor(
        message: string,
        readonly code: string | null,
        readonly productId: string | null = null
    ) {
        super(message);
    }

    /** Reddedilen satır varsa mesajın başına ürün adını koyar (ad bulunamazsa mesaj aynen kalır). */
    withProductName(nameOf: (productId: string) => string | null | undefined): string {
        const name = this.productId ? nameOf(this.productId) : null;

        return name ? `"${name}" satırı: ${this.message}` : this.message;
    }
}

function problemProductId(err: HttpErrorResponse): string | null {
    const body = err.error as Record<string, unknown> | null;

    if (!body || typeof body !== 'object') {
        return null;
    }

    const ext = body['extensions'] as Record<string, unknown> | undefined;
    const id = body['productId'] ?? ext?.['productId'];

    return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function toExaminationTemplateError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        const code = problemCodeFromHttpError(err);
        const message = (code && EXAMINATION_TEMPLATE_PROBLEM_MESSAGES[code]) || messageFromHttpError(err, fallback);

        return throwError(() => new ExaminationTemplateError(message, code, problemProductId(err)));
    });
}

function listQueryToHttpParams(q: ExaminationTemplatesListQuery): HttpParams {
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

/** Muayene şablonu (ADR-020 S4): muayenede ön dolum paketi seçimi/uygulaması ve Tanımlar altındaki yönetim. */
@Injectable({ providedIn: 'root' })
export class ExaminationTemplatesService {
    private readonly api = inject(ApiClient);

    list(query: ExaminationTemplatesListQuery): Observable<ExaminationTemplatePagedResultDto> {
        return this.api
            .get<ExaminationTemplatePagedResultDto>(ApiEndpoints.examinationTemplates.list(), listQueryToHttpParams(query))
            .pipe(toExaminationTemplateError('Şablonlar yüklenemedi.'));
    }

    create(request: ExaminationTemplateUpsertRequest): Observable<ExaminationTemplateDto> {
        return this.api
            .post<ExaminationTemplateDto>(ApiEndpoints.examinationTemplates.list(), request)
            .pipe(toExaminationTemplateError('Şablon kaydedilemedi.'));
    }

    update(id: string, request: ExaminationTemplateUpsertRequest, rowVersion: string): Observable<ExaminationTemplateDto> {
        return this.api
            .put<ExaminationTemplateDto>(ApiEndpoints.examinationTemplates.byId(id), { ...request, rowVersion })
            .pipe(toExaminationTemplateError('Şablon güncellenemedi.'));
    }

    setActive(id: string, active: boolean): Observable<void> {
        const path = active ? ApiEndpoints.examinationTemplates.activate(id) : ApiEndpoints.examinationTemplates.deactivate(id);

        return this.api.post<unknown>(path, {}).pipe(
            map(() => undefined),
            toExaminationTemplateError(active ? 'Şablon etkinleştirilemedi.' : 'Şablon pasifleştirilemedi.')
        );
    }

    /** `rowVersion` muayenenin güncel sürümüdür; hepsi ya da hiçbiri (bir satır reddedilirse hiçbir şey yazılmaz). */
    apply(examinationId: string, templateId: string, rowVersion: string): Observable<ExaminationTemplateApplyResultDto> {
        return this.api
            .post<ExaminationTemplateApplyResultDto>(ApiEndpoints.examinations.applyTemplate(examinationId), { templateId, rowVersion })
            .pipe(toExaminationTemplateError('Şablon uygulanamadı.'));
    }
}

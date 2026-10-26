import { HttpParams } from '@angular/common/http';

/** GET `/api/v1/reports/examinations` filtreleri — `from`/`to`, `clinicId`, `search`, sayfalama. */
export interface ExaminationsReportQuery {
    from?: string;
    to?: string;
    clinicId?: string;
    appointmentId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export function examinationsReportQueryToHttpParams(query: ExaminationsReportQuery, opts?: { omitPaging?: boolean }): HttpParams {
    let p = new HttpParams();

    if (!opts?.omitPaging) {
        p = p.set('page', String(query.page ?? 1));
        p = p.set('pageSize', String(query.pageSize ?? 25));
    }

    if (query.from?.trim()) {
        p = p.set('from', query.from.trim());
    }

    if (query.to?.trim()) {
        p = p.set('to', query.to.trim());
    }

    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }

    if (query.appointmentId?.trim()) {
        p = p.set('appointmentId', query.appointmentId.trim());
    }

    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }

    return p;
}

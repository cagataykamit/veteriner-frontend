import { HttpParams } from '@angular/common/http';

/** GET `/api/v1/reports/vaccinations` filtreleri — `from`/`to`, `clinicId`, `status`, `search`, sayfalama. */
export interface VaccinationsReportQuery {
    from?: string;
    to?: string;
    clinicId?: string;
    status?: string;
    clientId?: string;
    petId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export function vaccinationsReportQueryToHttpParams(query: VaccinationsReportQuery, opts?: { omitPaging?: boolean }): HttpParams {
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
    if (query.status?.trim()) {
        p = p.set('status', query.status.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('clientId', query.clientId.trim());
    }
    if (query.petId?.trim()) {
        p = p.set('petId', query.petId.trim());
    }
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    return p;
}

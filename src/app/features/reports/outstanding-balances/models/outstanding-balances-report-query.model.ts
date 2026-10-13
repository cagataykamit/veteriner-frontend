import { HttpParams } from '@angular/common/http';

/** GET `/api/v1/reports/outstanding-balances` filtreleri; tarih, müşteri ve hayvan süzgeci yoktur. */
export interface OutstandingBalancesReportQuery {
    clinicId?: string;
    minAmount?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export function outstandingBalancesReportQueryToHttpParams(query: OutstandingBalancesReportQuery, opts?: { omitPaging?: boolean }): HttpParams {
    let p = new HttpParams();
    if (!opts?.omitPaging) {
        p = p.set('page', String(query.page ?? 1));
        p = p.set('pageSize', String(query.pageSize ?? 25));
    }
    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }
    if (query.minAmount?.trim()) {
        p = p.set('minAmount', query.minAmount.trim());
    }
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    return p;
}

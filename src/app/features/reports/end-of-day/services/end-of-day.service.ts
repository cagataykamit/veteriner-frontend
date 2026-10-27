import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_READ_CLAIM, PAYMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { CashSummaryDto, DailyTransactionsDto, DailyTransactionsResultVm, EndOfDayOpenItemsDto } from '@/app/features/reports/end-of-day/models/end-of-day.model';
import type { ReportListQueryBase, ReportListSource } from '@/app/features/reports/shared/report-list-state';
import { mapTodayOpenItemsDtoToVm } from '@/app/entities/visit/data/visit.mapper';
import type { TodayOpenItemsVm } from '@/app/entities/visit/models/visit-vm.model';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';

/** Üç gün sonu ucunun ortak süzgeçleri; gün sonu `from`/`to` takvim günüdür (`yyyy-MM-dd`). */
export function endOfDayQueryToHttpParams(query: ReportListQueryBase, opts?: { omitPaging?: boolean; listFilters?: boolean }): HttpParams {
    let p = new HttpParams();

    if (!opts?.omitPaging) {
        p = p.set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 50));
    }

    const keys = opts?.listFilters ? (['from', 'to', 'clinicId', 'kind', 'paymentMethod', 'performedByUserId'] as const) : (['from', 'to', 'clinicId'] as const);

    for (const key of keys) {
        const value = query[key]?.trim();

        if (value) {
            p = p.set(key, value);
        }
    }

    return p;
}

/** Sorguda klinik yoksa panelin aktif klinik bağlamı kullanılır. */
function withActiveClinic(auth: AuthService, query: ReportListQueryBase): ReportListQueryBase {
    return { ...query, clinicId: query.clinicId?.trim() || auth.getClinicId()?.trim() || undefined };
}

/** Günlük işlem dökümü: liste ve dışa aktarma aynı süzgeç kümesiyle çalışır (ekran = CSV = XLSX). */
@Injectable({ providedIn: 'root' })
export class DailyTransactionsSource implements ReportListSource<ReportListQueryBase, DailyTransactionsResultVm> {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Döküm `Payments.Read` ve `Charges.Read` ister; biri yoksa istek atılmaz (sayfa dökümü zaten gizler). */
    readonly allowed = (): boolean => [PAYMENTS_READ_CLAIM, CHARGES_READ_CLAIM].every((c) => this.auth.hasOperationClaim(c));

    loadReport(query: ReportListQueryBase): Observable<DailyTransactionsResultVm> {
        const merged = withActiveClinic(this.auth, query);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 50;

        if (!this.allowed()) {
            return of({ currency: 'TRY', from: '', to: '', totals: ZERO_TOTALS, totalCount: 0, items: [], page, pageSize });
        }

        return this.api
            .get<DailyTransactionsDto>(ApiEndpoints.reports.dailyTransactions(), endOfDayQueryToHttpParams(merged, { listFilters: true }))
            .pipe(map((raw) => ({ ...raw, page, pageSize })));
    }

    exportCsvBlob(query: ReportListQueryBase) {
        return this.exportBlob(`${ApiEndpoints.reports.dailyTransactions()}/export`, query);
    }

    exportXlsxBlob(query: ReportListQueryBase) {
        return this.exportBlob(`${ApiEndpoints.reports.dailyTransactions()}/export-xlsx`, query);
    }

    private exportBlob(path: string, query: ReportListQueryBase) {
        const params = endOfDayQueryToHttpParams(withActiveClinic(this.auth, query), { omitPaging: true, listFilters: true });

        return this.api.getBlob(path, params).pipe(
            catchError((err) => throwError(() => userErrorFromHttp(err, PANEL_COPY.reportsExportFailedFallback)))
        );
    }

}

const ZERO_TOTALS = {
    grossChargeAmount: 0,
    grossChargeCount: 0,
    salesChargeAmount: 0,
    voidedChargeAmount: 0,
    voidedChargeCount: 0,
    netChargeAmount: 0,
    collectedAmount: 0,
    collectedCount: 0,
    salesCollectedAmount: 0,
    voidedCollectionAmount: 0,
    voidedCollectionCount: 0,
    netCollectedAmount: 0,
    correctionCount: 0
};

/** Tahsilat/kasa özeti ve gün sonu açık işleri (özet bölümleri; liste `DailyTransactionsSource`). */
@Injectable({ providedIn: 'root' })
export class EndOfDayService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** GET `/api/v1/reports/cash-summary` */
    loadCashSummary(query: ReportListQueryBase): Observable<CashSummaryDto> {
        return this.api.get<CashSummaryDto>(ApiEndpoints.reports.cashSummary(), endOfDayQueryToHttpParams(withActiveClinic(this.auth, query), { omitPaging: true }));
    }

    /**
     * GET `/api/v1/reports/end-of-day/open-items` — tek klinik zorunlu; klinik yoksa istek atılmaz (`null`).
     * Alanlar izne göre `null` olabilir ("yetki yok", "yok" demek değildir).
     */
    loadOpenItems(query: ReportListQueryBase): Observable<TodayOpenItemsVm | null> {
        const merged = withActiveClinic(this.auth, query);

        if (!merged.clinicId) {
            return of(null);
        }

        return this.api
            .get<EndOfDayOpenItemsDto>(ApiEndpoints.reports.endOfDayOpenItems(), endOfDayQueryToHttpParams(merged, { omitPaging: true }))
            .pipe(map((res) => mapTodayOpenItemsDtoToVm(res.openItems)));
    }

}

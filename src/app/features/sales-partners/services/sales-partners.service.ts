import { HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError, type MonoTypeOperatorFunction } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    DiscountCodeDto,
    DiscountCodeTermsInput,
    DiscountCollectionDto,
    DiscountRedemptionRowDto,
    SalesPartnerDetailDto,
    SalesPartnerDto,
    SalesPartnerInput
} from '@/app/entities/sales-partner/models/sales-partner.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const SALES_PARTNER_PROBLEM_MESSAGES: Record<string, string> = {
    'DiscountCodes.DuplicateCode': 'Bu kod zaten kullanılıyor; farklı bir kod yazın.',
    'DiscountCodes.NotFound': 'Kod bulunamadı.',
    'SalesPartners.NotFound': 'Satış ortağı bulunamadı.',
    'Tenants.NotFound': 'Bağlı kurum kimliği bulunamadı.',
    'DiscountRedemptions.CommissionNotAccrued': 'Seçilen satırlardan biri zaten ödenmiş ya da iptal edilmiş; liste yenilendi.',
    'DiscountRedemptions.CollectionNotFound': 'Tahsilat satırı bulunamadı; liste yenilendi.',
    'DiscountRedemptions.CollectionAlreadyCancelled': 'Tahsilat zaten iptal edilmiş.'
};

function toSalesPartnerError<T>(fallback: string): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
        }

        return throwError(() => new Error(messageFromHttpError(err, fallback, SALES_PARTNER_PROBLEM_MESSAGES)));
    });
}

/** Platform yöneticisi: satış ortakları, kodlar, kullanım satırları ve komisyon (ADR-037). */
@Injectable({ providedIn: 'root' })
export class SalesPartnersService {
    private readonly api = inject(ApiClient);

    list(): Observable<SalesPartnerDto[]> {
        return this.api.get<SalesPartnerDto[]>(ApiEndpoints.salesPartners.list()).pipe(toSalesPartnerError('Satış ortakları yüklenemedi.'));
    }

    get(id: string): Observable<SalesPartnerDetailDto> {
        return this.api.get<SalesPartnerDetailDto>(ApiEndpoints.salesPartners.byId(id)).pipe(toSalesPartnerError('Satış ortağı yüklenemedi.'));
    }

    create(input: SalesPartnerInput): Observable<SalesPartnerDto> {
        return this.api.post<SalesPartnerDto>(ApiEndpoints.salesPartners.list(), input).pipe(toSalesPartnerError('Satış ortağı eklenemedi.'));
    }

    update(id: string, input: SalesPartnerInput): Observable<SalesPartnerDto> {
        return this.api.put<SalesPartnerDto>(ApiEndpoints.salesPartners.byId(id), input).pipe(toSalesPartnerError('Satış ortağı güncellenemedi.'));
    }

    createCode(partnerId: string, input: DiscountCodeTermsInput): Observable<DiscountCodeDto> {
        return this.api.post<DiscountCodeDto>(ApiEndpoints.salesPartners.codes(partnerId), input).pipe(toSalesPartnerError('Kod eklenemedi.'));
    }

    updateCode(partnerId: string, codeId: string, input: DiscountCodeTermsInput): Observable<DiscountCodeDto> {
        return this.api
            .put<DiscountCodeDto>(ApiEndpoints.salesPartners.codeById(partnerId, codeId), input)
            .pipe(toSalesPartnerError('Kod güncellenemedi.'));
    }

    setCodeActive(partnerId: string, codeId: string, active: boolean): Observable<DiscountCodeDto> {
        const path = active ? ApiEndpoints.salesPartners.codeActivate(partnerId, codeId) : ApiEndpoints.salesPartners.codeDeactivate(partnerId, codeId);

        return this.api.post<DiscountCodeDto>(path, {}).pipe(toSalesPartnerError(active ? 'Kod açılamadı.' : 'Kod kapatılamadı.'));
    }

    redemptions(partnerId: string): Observable<DiscountRedemptionRowDto[]> {
        return this.api
            .get<DiscountRedemptionRowDto[]>(ApiEndpoints.salesPartners.redemptions(partnerId))
            .pipe(toSalesPartnerError('Kullanım satırları yüklenemedi.'));
    }

    markPaid(partnerId: string, collectionIds: readonly string[], paidAtUtc: string, note: string | null): Observable<number> {
        return this.api
            .post<{ updatedCount: number }>(ApiEndpoints.salesPartners.markPaid(partnerId), { collectionIds, paidAtUtc, note })
            .pipe(
                map((r) => r.updatedCount),
                toSalesPartnerError('Komisyon ödendi işaretlenemedi.')
            );
    }

    cancelCollection(partnerId: string, collectionId: string, reason: string): Observable<DiscountCollectionDto> {
        return this.api
            .post<DiscountCollectionDto>(ApiEndpoints.salesPartners.cancelCollection(partnerId, collectionId), { reason })
            .pipe(toSalesPartnerError('Tahsilat iptal edilemedi.'));
    }

    exportCsv(partnerId?: string): Observable<HttpResponse<Blob>> {
        const params = partnerId ? new HttpParams().set('partnerId', partnerId) : undefined;

        return this.api.getBlob(ApiEndpoints.salesPartners.exportCsv(), params).pipe(toSalesPartnerError('CSV indirilemedi.'));
    }
}

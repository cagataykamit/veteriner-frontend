/**
 * Ödeme listesi — GET `/api/v1/payments`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Method`, `FromDate`, `ToDate`
 * (+ ilişkili filtreler: `ClientId`, `PetId`, `clinicId`).
 * `Search`: Notes, Currency veya müşteri/hayvan metin eşleşmesiyle Client/Pet (tutar aranmaz; boşsa gönderilmez).
 */

export interface PaymentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    clientId?: string;
    petId?: string;
    /**
     * Form canonical değeri (cash / card / transfer) — HTTP’de `method` sayısal enum olarak gönderilir.
     */
    method?: string;
    /** `type="date"` (yyyy-MM-dd); istekte `FromDate` olarak gider. */
    paidFromDate?: string;
    /** `type="date"` (yyyy-MM-dd); istekte `ToDate` olarak gider. */
    paidToDate?: string;
}

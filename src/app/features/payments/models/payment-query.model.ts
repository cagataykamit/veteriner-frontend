/**
 * Ödeme listesi — GET `/api/v1/payments`.
 * `search`: Notes, Currency veya müşteri/hayvan metin eşleşmesiyle Client/Pet (tutar aranmaz; boşsa gönderilmez).
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
    /** `type="date"` (yyyy-MM-dd); istekte `paidFromUtc` ISO UTC olarak gider. */
    paidFromDate?: string;
    /** `type="date"` (yyyy-MM-dd); istekte `paidToUtc` gün sonu ISO UTC olarak gider. */
    paidToDate?: string;
}

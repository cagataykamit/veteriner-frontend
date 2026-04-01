/**
 * Ödeme listesi sorgu parametreleri — backend GET list kontratı ile uyumlu.
 * @see PaymentsService + paymentsQueryToHttpParams
 */

export interface PaymentsListQuery {
    page?: number;
    pageSize?: number;
    /**
     * Backend `search` — müşteri adı / e-posta / telefon, hayvan, para birimi, not (tutar aranmaz).
     * Boş veya yalnızca boşluksa istekte gönderilmez.
     */
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

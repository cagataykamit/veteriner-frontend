/**
 * Tedavi listesi — GET `/api/v1/treatments`.
 * `search`: başlık, açıklama, not ve pet/müşteri metin kümesi (backend contract).
 */

export interface TreatmentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

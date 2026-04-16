/**
 * Tedavi listesi — GET `/api/v1/treatments`.
 * HttpParams: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`).
 * `Search`: başlık, açıklama, not ve pet/müşteri metin kümesi (backend contract).
 */

export interface TreatmentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** Muayene/tedavi seçicileri için hayvana göre daraltma (backend `PetId`). */
    petId?: string;
    /** yyyy-MM-dd; istekte `FromDate` olarak gider. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte `ToDate` olarak gider. */
    toDate?: string;
    sort?: string;
    order?: string;
}

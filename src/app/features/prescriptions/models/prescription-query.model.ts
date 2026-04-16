/**
 * Reçete listesi — GET `/api/v1/prescriptions`.
 * HttpParams: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order` (+ `clinicId`, `PetId`).
 */

export interface PrescriptionsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** Hayvana göre daraltma (backend `PetId`). */
    petId?: string;
    /** yyyy-MM-dd; istekte `FromDate` olarak gider. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte `ToDate` olarak gider. */
    toDate?: string;
    sort?: string;
    order?: string;
}

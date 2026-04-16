/**
 * GET `/api/v1/lab-results` — liste sorgusu.
 *
 * HttpParams (canonical): `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `FromDate`, `ToDate`, `Sort`, `Order`.
 * `fromDate` / `toDate` istekte sırasıyla `FromDate` / `ToDate` olarak gider; değer **yyyy-MM-dd** (date-only).
 */

export interface LabResultsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    /** yyyy-MM-dd; istekte `FromDate`. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte `ToDate`. */
    toDate?: string;
    sort?: string;
    order?: string;
}

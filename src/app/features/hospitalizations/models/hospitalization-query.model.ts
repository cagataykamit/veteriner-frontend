/**
 * GET `/api/v1/hospitalizations` — liste sorgusu.
 *
 * HttpParams (canonical): `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `ActiveOnly`, `FromDate`, `ToDate`, `Sort`, `Order`.
 * `fromDate` / `toDate` istekte `FromDate` / `ToDate`; değer **yyyy-MM-dd**.
 * `activeOnly` istekte `ActiveOnly` (`true` / `false` string); `undefined` iken gönderilmez.
 */

export interface HospitalizationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    /** true: yalnız aktif; false: yalnız taburcu; undefined: tümü — istekte `ActiveOnly`. */
    activeOnly?: boolean;
    /** yyyy-MM-dd; istekte `FromDate`. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte `ToDate`. */
    toDate?: string;
    sort?: string;
    order?: string;
}

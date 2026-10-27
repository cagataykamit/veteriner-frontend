/**
 * GET `/api/v1/hospitalizations` — liste sorgusu.
 *
 * HttpParams (canonical): `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `ActiveOnly`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order`.
 * `fromDate` / `toDate` (**yyyy-MM-dd**) istekte İstanbul günü başı / sonu UTC olarak `dateFromUtc` / `dateToUtc` gider (yatış zamanı).
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
    /** yyyy-MM-dd; istekte İstanbul günü başı UTC `dateFromUtc`. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte İstanbul günü sonu UTC `dateToUtc`. */
    toDate?: string;
    sort?: string;
    order?: string;
}

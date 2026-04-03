/**
 * GET `/api/v1/hospitalizations` — liste sorgusu.
 */

export interface HospitalizationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    petId?: string;
    /** true: yalnız aktif; false: yalnız taburcu; undefined: tümü */
    activeOnly?: boolean;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

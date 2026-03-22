/**
 * Aşı listesi sorgu parametreleri.
 */

export interface VaccinationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

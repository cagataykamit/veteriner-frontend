/**
 * Randevu listesi sorgu parametreleri (UI + service).
 */

export interface AppointmentsListQuery {
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

/**
 * Ödeme listesi sorgu parametreleri.
 */

export interface PaymentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    method?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

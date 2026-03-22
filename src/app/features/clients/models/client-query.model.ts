/** GET /api/v1/clients sorgu parametreleri (Swagger: Page, PageSize, Sort, Order, Search). */
export interface ClientsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    order?: string;
    /**
     * Backend şemasında yoksa HttpParams'a eklenmez; ileride API desteklerse mapper açılır.
     */
    status?: string | null;
}

/** GET /api/v1/pets — Page, PageSize, Sort, Order, Search (+ isteğe bağlı Species, ClientId). */
export interface PetsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    order?: string;
    /** Backend şemasında yoksa HttpParams’a eklenmez. */
    species?: string | null;
    clientId?: string | null;
    status?: string | null;
}

/**
 * GET `/api/v1/clients` — HttpParams: `Page`, `PageSize`, `Search`, `Sort`, `Order`.
 * `Search` sunucuda FullName / Email / Phone / PhoneNormalized üzerinde; boşsa gönderilmez.
 */
export interface ClientsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    order?: string;
}

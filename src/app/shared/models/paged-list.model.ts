/** Sayfalı liste yanıtları için ortak tip (backend ile uyum sağlanacak). */
export interface PagedList<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

/** Bazı API'lerde sadece dizi + toplam kayıt döner. */
export interface ListResult<T> {
    items: T[];
    total?: number;
}

/** GET /api/v1/clients — `search`: FullName, Email, Phone, PhoneNormalized (boşsa gönderilmez). */
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

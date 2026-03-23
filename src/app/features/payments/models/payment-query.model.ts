/**
 * Ödeme listesi sorgu parametreleri.
 */

export interface PaymentsListQuery {
    page?: number;
    pageSize?: number;
    /** İsteğe bağlı — backend `ClientId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    clientId?: string;
    /** İsteğe bağlı — backend `PetId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    petId?: string;
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

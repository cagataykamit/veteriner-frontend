/**
 * Muayene listesi sorgu parametreleri.
 */

export interface ExaminationsListQuery {
    page?: number;
    pageSize?: number;
    /** İsteğe bağlı — backend `PetId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    petId?: string;
    /** İsteğe bağlı — backend `ClientId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    clientId?: string;
    search?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

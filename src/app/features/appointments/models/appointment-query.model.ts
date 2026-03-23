/**
 * Randevu listesi sorgu parametreleri (UI + service).
 */

export interface AppointmentsListQuery {
    page?: number;
    pageSize?: number;
    /** İsteğe bağlı — backend `PetId` / `ClientId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    petId?: string;
    clientId?: string;
    search?: string;
    status?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

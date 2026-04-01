/**
 * Randevu listesi sorgu parametreleri (UI + service).
 */

export interface AppointmentsListQuery {
    page?: number;
    pageSize?: number;
    /** Boşsa gönderilmez — not, müşteri/hayvan adı. */
    search?: string;
    clinicId?: string;
    /** İsteğe bağlı — backend `PetId` / `ClientId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    petId?: string;
    clientId?: string;
    status?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

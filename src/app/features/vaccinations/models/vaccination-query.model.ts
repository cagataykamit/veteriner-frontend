/**
 * Aşı listesi sorgu parametreleri.
 */

export interface VaccinationsListQuery {
    page?: number;
    pageSize?: number;
    /** İsteğe bağlı — backend `PetId` desteklemiyorsa istemci tarafında filtre uygulanır. */
    petId?: string;
    /** İsteğe bağlı — backend `ClientId`/`OwnerId` desteklemiyorsa yok sayılır. */
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

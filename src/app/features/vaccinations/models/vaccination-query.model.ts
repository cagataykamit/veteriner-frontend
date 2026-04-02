/**
 * Aşı listesi — GET `/api/v1/vaccinations`.
 * `search`: VaccineName, Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
 */

export interface VaccinationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Aktif klinik; gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
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

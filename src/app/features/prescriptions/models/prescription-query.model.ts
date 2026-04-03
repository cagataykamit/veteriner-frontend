/**
 * Reçete listesi — GET `/api/v1/prescriptions`.
 */

export interface PrescriptionsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** Hayvana göre daraltma (backend `PetId`). */
    petId?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

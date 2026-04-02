/**
 * Randevu listesi — GET `/api/v1/appointments`.
 * `search`: Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
 * `petId`: Liste ekranında kullanılmaz; panel özet / ilişkili çağrılar için opsiyonel.
 */

export interface AppointmentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
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

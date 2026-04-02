/**
 * Muayene listesi — GET `/api/v1/examinations`.
 * `search`: VisitReason, Findings, Assessment, Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
 */

export interface ExaminationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Aktif klinik; gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    petId?: string;
    clientId?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

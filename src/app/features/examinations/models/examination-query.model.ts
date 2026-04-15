/**
 * Muayene listesi — GET `/api/v1/examinations`.
 * HttpParams: `Page`, `PageSize`, `Search`, `FromDate`, `ToDate`, `Sort`, `Order`
 * (+ ilişkili filtreler: `clinicId`, `PetId`, `ClientId`, `appointmentId`).
 * `Search`: VisitReason, Findings, Assessment, Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
 */

export interface ExaminationsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Aktif klinik; gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    petId?: string;
    clientId?: string;
    /** Randevuya bağlı muayeneler; backend `Examination.AppointmentId` ile eşleştirir. */
    appointmentId?: string;
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    sort?: string;
    order?: string;
}

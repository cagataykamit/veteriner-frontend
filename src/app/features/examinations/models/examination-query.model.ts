/**
 * Muayene listesi — GET `/api/v1/examinations`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Sort`, `Order`, `dateFromUtc`, `dateToUtc`
 * (+ ilişkili filtreler: `clinicId`, `PetId`, `ClientId`, `appointmentId`).
 * Tarih: `fromDate`/`toDate` UI'dan İstanbul takvim günü (`yyyy-MM-dd`) olarak gelir;
 * mapper `dateFromUtc` (dahil) / `dateToUtc` (hariç, bitiş gününün ertesi başlangıcı) üretir.
 * `FromDate`/`ToDate` sorgu parametreleri backend'de yoktur ve gönderilmez.
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
    /** yyyy-MM-dd — İstanbul günü, dahil. */
    fromDate?: string;
    /** yyyy-MM-dd — İstanbul günü, dahil (API'ye ertesi gün başlangıcı hariç sınır olarak gider). */
    toDate?: string;
    sort?: string;
    order?: string;
}

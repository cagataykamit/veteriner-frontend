/**
 * Randevu listesi — GET `/api/v1/appointments`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Status`, `FromDate`, `ToDate`, `Sort`, `Order`
 * (+ ilişkili filtreler: `clinicId`, `PetId`, `ClientId`).
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
    /** Örn. `ScheduledAtUtc` — backend liste uçlarında `Sort` query ile eşlenir. */
    sort?: string;
    /** Örn. `desc` / `asc` — `Order` query. */
    order?: string;
}

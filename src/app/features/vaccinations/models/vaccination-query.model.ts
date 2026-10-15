/**
 * Aşı listesi — GET `/api/v1/vaccinations`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order`
 * (+ isteğe bağlı `OnlyOverdue`, + ilişkili filtreler: `clinicId`, `PetId`, `ClientId`).
 * `Search`: VaccineName, Notes ve pet metin kümesi (hayvan adı, tür, ırk, müşteri metni; boşsa gönderilmez).
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
    /** yyyy-MM-dd (İstanbul günü); Uygulandı ise uygulama, değilse vade tarihi üzerinden süzer. */
    fromDate?: string;
    /** yyyy-MM-dd (İstanbul günü, dahil) */
    toDate?: string;
    /**
     * Planlanmış ve vadesi geçmiş aşıları daraltır (dashboard derin bağlantısı).
     * Backend desteklemiyorsa yok sayılabilir; entegrasyon notlarına bakın.
     */
    onlyOverdue?: boolean;
    /** Backend beyaz listesi: `dueAtUtc` | `appliedAtUtc`; başka değer 400. */
    sort?: string;
    /** `asc` | `desc` */
    order?: string;
}

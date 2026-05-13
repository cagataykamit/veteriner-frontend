/**
 * Aşı listesi — GET `/api/v1/vaccinations`.
 * HttpParams: `Page`, `PageSize`, `Search`, `Status`, `FromDate`, `ToDate`, `Sort`, `Order`
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
    /** yyyy-MM-dd */
    fromDate?: string;
    /** yyyy-MM-dd */
    toDate?: string;
    /**
     * Planlanmış ve vadesi geçmiş aşıları daraltır (dashboard derin bağlantısı).
     * Backend desteklemiyorsa yok sayılabilir; entegrasyon notlarına bakın.
     */
    onlyOverdue?: boolean;
    sort?: string;
    order?: string;
}

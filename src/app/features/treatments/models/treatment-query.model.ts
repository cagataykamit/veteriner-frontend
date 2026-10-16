/**
 * Tedavi listesi — GET `/api/v1/treatments`.
 * HttpParams: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order` (+ `clinicId`, `PetId`).
 * `Search`: başlık, açıklama, not ve pet/müşteri metin kümesi (backend contract).
 */

export interface TreatmentsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** Muayene/tedavi seçicileri için hayvana göre daraltma (backend `PetId`). */
    petId?: string;
    /** yyyy-MM-dd; istekte İstanbul günü başı UTC `dateFromUtc` olarak gider. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte İstanbul günü sonu UTC `dateToUtc` olarak gider. */
    toDate?: string;
    sort?: string;
    order?: string;
    /**
     * `true`: yalnız aktif tedaviler (backend `active=true`; ADR-025: takip tarihi İstanbul günüyle bugün veya sonrası),
     * sort verilmezse en yakın takip önce. Aktiflik istemcide yeniden hesaplanmaz.
     */
    active?: boolean;
}

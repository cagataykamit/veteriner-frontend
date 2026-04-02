/** GET /api/v1/pets — `search`: hayvan adı, serbest ırk, tür adı, katalog ırk adı; müşteri metnine göre pet eşleşmesi (boşsa gönderilmez). */
export interface PetsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    order?: string;
    /** Yeni contract filtre alanı. */
    speciesId?: string | null;
    /**
     * Geçici uyum: eski backend `Species` text bekliyorsa kullanılabilir.
     * Yeni akışta list filter sadece `speciesId` kullanır.
     */
    species?: string | null;
    clientId?: string | null;
}

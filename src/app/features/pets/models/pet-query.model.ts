/** GET /api/v1/pets — Page, PageSize, search, Sort, Order, SpeciesId, ClientId. */
export interface PetsListQuery {
    page?: number;
    pageSize?: number;
    /** İsim, ırk, tür, referans; müşteri eşleşmesiyle petler (boşsa gönderilmez). */
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

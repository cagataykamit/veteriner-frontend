import type { PetLifeStatus } from '@/app/features/pets/utils/pet-status.utils';

/**
 * GET `/api/v1/pets` — HttpParams: `Page`, `PageSize`, `Search`, `Sort`, `Order`, `SpeciesId`, `ClientId`, `Status` (+ opsiyonel legacy `Species`).
 * `Search`: hayvan adı, serbest ırk, tür adı, katalog ırk adı; müşteri metnine göre eşleşme (boşsa gönderilmez).
 */
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
    /** Verilmezse tümü (vefat edenler dahil; önceki davranış). */
    status?: PetLifeStatus | null;
}

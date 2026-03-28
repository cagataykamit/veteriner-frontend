/**
 * Yeni hayvan kaydı — UI / servis isteği.
 * `birthDateInput` HTML `type="date"` (yyyy-MM-dd); ISO UTC mapper’da `date.utils` ile üretilir.
 * Create/edit: typed `PetUpsertFormValue` → `mapPetUpsertFormToCreateRequest` → `mapCreatePetToApiBody` (`pet.mapper.ts`, `pet-upsert-form.factory.ts`).
 */

export interface CreatePetRequest {
    clientId: string;
    name: string;
    speciesId: string;
    /** Yeni contract: breed referans kimliği */
    breedId?: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri text `breed` bekleyebilir. */
    breed?: string;
    gender?: string;
    /** yyyy-MM-dd — boşsa doğum tarihi gönderilmez */
    birthDateInput?: string;
    color?: string;
    weight?: number | null;
    status?: string;
    notes?: string;
}

/**
 * Backend Veteriner API — aşı listesi DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface VaccinationListItemDto {
    id: string;
    tenantId?: string;
    appliedAtUtc?: string | null;
    applicationDateUtc?: string | null;
    appliedOnUtc?: string | null;
    nextDueAtUtc?: string | null;
    nextDoseAtUtc?: string | null;
    dueAtUtc?: string | null;
    vaccineName?: string | null;
    name?: string | null;
    vaccine?: string | null;
    vaccineTypeName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    status?: string | null;
    vaccinationStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    dueState?: string | null;
    isDueSoon?: boolean | null;
    isOverdue?: boolean | null;
    notes?: string | null;
    note?: string | null;
    description?: string | null;
}

export interface VaccinationListItemDtoPagedResult {
    items?: VaccinationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /vaccinations/{id} — liste öğesi ile aynı çekirdek alanlar + audit. */
export interface VaccinationDetailDto {
    id: string;
    tenantId?: string;
    appliedAtUtc?: string | null;
    applicationDateUtc?: string | null;
    appliedOnUtc?: string | null;
    nextDueAtUtc?: string | null;
    nextDoseAtUtc?: string | null;
    dueAtUtc?: string | null;
    vaccineName?: string | null;
    name?: string | null;
    vaccine?: string | null;
    vaccineTypeName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    status?: string | null;
    vaccinationStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    dueState?: string | null;
    isDueSoon?: boolean | null;
    isOverdue?: boolean | null;
    notes?: string | null;
    note?: string | null;
    description?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST /vaccinations body — camelCase.
 * Varsayım: pet üzerinden müşteri ilişkisi kurulur; `clientId` çoğu API’de gönderilmez.
 * Backend `name` kullanıyorsa mapper’da `vaccineName` → `name` eşlemesi yapılır.
 */
export interface VaccinationCreateRequestDto {
    petId: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri owner/client kimliği de bekleyebilir. */
    clientId?: string | null;
    ownerId?: string | null;
    vaccineName: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri `name` alanını kullanabilir. */
    name?: string | null;
    appliedAtUtc: string;
    /** Geçici geri uyumluluk: bazı backend sürümleri `applicationDateUtc`/`appliedOnUtc` alanlarını kullanabilir. */
    applicationDateUtc?: string | null;
    appliedOnUtc?: string | null;
    nextDueAtUtc?: string | null;
    nextDoseAtUtc?: string | null;
    dueAtUtc?: string | null;
    status?: string | null;
    vaccinationStatus?: string | null;
    notes?: string | null;
    note?: string | null;
}

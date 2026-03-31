/**
 * Backend Veteriner API — aşı listesi DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface VaccinationListItemDto {
    id: string;
    tenantId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientName?: string | null;
    clientId?: string | null;
    clinicId?: string | null;
    examinationId?: string | null;
    vaccineName?: string | null;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    status?: number | null;
    notes?: string | null;
}

export interface VaccinationListItemDtoPagedResult {
    items?: VaccinationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * GET /vaccinations/{id}
 * Beklenen çekirdek: id, clinicId?, clientId, clientName?, petId, petName?, vaccineName, status,
 * appliedAtUtc, dueAtUtc (liste: nextDueAtUtc), notes, examinationId?
 */
export interface VaccinationDetailDto {
    id: string;
    tenantId?: string | null;
    petId: string;
    petName?: string | null;
    clientName?: string | null;
    clientId: string;
    clinicId?: string | null;
    examinationId?: string | null;
    vaccineName: string;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    status: number;
    notes?: string | null;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
}

/**
 * POST /vaccinations body — camelCase.
 * Varsayım: pet üzerinden müşteri ilişkisi kurulur; `clientId` çoğu API’de gönderilmez.
 * Backend `name` kullanıyorsa mapper’da `vaccineName` → `name` eşlemesi yapılır.
 */
export interface VaccinationCreateRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineName: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}

export interface VaccinationUpdateRequestDto {
    id?: string;
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineName: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}

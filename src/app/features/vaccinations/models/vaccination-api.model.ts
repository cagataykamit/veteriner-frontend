/**
 * Backend Veteriner API — aşı listesi DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface VaccinationListItemDto {
    id: string;
    tenantId?: string;
    appliedAtUtc?: string | null;
    nextDueAtUtc?: string | null;
    vaccineName?: string | null;
    name?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    status?: string | null;
    notes?: string | null;
}

export interface VaccinationListItemDtoPagedResult {
    items?: VaccinationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

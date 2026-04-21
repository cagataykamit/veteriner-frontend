/** GET `/api/v1/reports/vaccinations` */
export interface VaccinationsReportDto {
    totalCount?: number | string | null;
    items?: VaccinationsReportItemDto[] | null;
}

/** Backend rapor satırı (`effectiveReportDateUtc` dahil). */
export interface VaccinationsReportItemDto {
    vaccinationId?: string | null;
    id?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    vaccineName?: string | null;
    status?: number | string | null;
    appliedAtUtc?: string | null;
    nextDueAtUtc?: string | null;
    dueAtUtc?: string | null;
    effectiveReportDateUtc?: string | null;
    notes?: string | null;
}

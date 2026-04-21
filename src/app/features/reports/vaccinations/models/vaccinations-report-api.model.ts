import type { VaccinationListItemDto } from '@/app/features/vaccinations/models/vaccination-api.model';

/** GET `/api/v1/reports/vaccinations` */
export interface VaccinationsReportDto {
    totalCount?: number | string | null;
    items?: VaccinationListItemDto[] | null;
}

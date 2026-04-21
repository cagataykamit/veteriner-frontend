import type { ExaminationListItemDto } from '@/app/features/examinations/models/examination-api.model';

/** GET `/api/v1/reports/examinations` */
export interface ExaminationsReportDto {
    totalCount?: number | string | null;
    items?: ExaminationListItemDto[] | null;
}

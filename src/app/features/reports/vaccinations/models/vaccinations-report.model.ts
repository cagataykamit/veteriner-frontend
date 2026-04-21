import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';

/** Aşı raporu tablo satırı — liste VM + klinik / ana tarih gösterimi. */
export type VaccinationReportRowVm = VaccinationListItemVm & {
    readonly clinicLabel: string;
    /** Backend tarafından status kuralıyla belirlenen rapor tarihi. */
    readonly effectiveReportDateUtc: string | null;
};

export interface VaccinationsReportResultVm {
    readonly items: readonly VaccinationReportRowVm[];
    readonly totalCount: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}

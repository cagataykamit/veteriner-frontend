/** Aşı tanımı — dropdown / liste görünümü. */
export interface VaccineDefinitionListItemVm {
    id: string;
    tenantId: string | null;
    speciesId: string | null;
    name: string;
    code: string;
    description: string | null;
    defaultNextDueDays: number | null;
    isCore: boolean;
    isActive: boolean;
    /** Klinik sınıf (WSAVA 2024 / ESCCAP); `null` sınıfsız. */
    category: VaccineCategory | null;
}

export type VaccineCategory = 'Core' | 'NonCore' | 'NotRecommended' | 'ParasiteControl';

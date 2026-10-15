export interface SpeciesListItemVm {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

export type SpeciesDetailVm = SpeciesListItemVm;

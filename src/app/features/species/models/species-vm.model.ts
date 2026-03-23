export interface SpeciesListItemVm {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

export interface SpeciesDetailVm extends SpeciesListItemVm {}

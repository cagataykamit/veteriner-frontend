export interface BreedListItemVm {
    id: string;
    speciesId: string | null;
    speciesName: string;
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

export interface BreedDetailVm extends BreedListItemVm {}

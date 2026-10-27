export interface BreedListItemVm {
    id: string;
    speciesId: string | null;
    speciesName: string;
    name: string;
    isActive: boolean;
}

export interface BreedDetailVm extends BreedListItemVm {
    speciesCode: string;
}

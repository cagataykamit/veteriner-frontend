export interface BreedListItemDto {
    id: string;
    speciesId?: string | null;
    speciesName?: string | null;
    code?: string | null;
    name?: string | null;
    isActive?: boolean | null;
    displayOrder?: number | null;
}

export interface BreedDetailDto {
    id: string;
    speciesId?: string | null;
    speciesName?: string | null;
    code?: string | null;
    name?: string | null;
    isActive?: boolean | null;
    displayOrder?: number | null;
}

export interface BreedUpsertRequestDto {
    speciesId: string;
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

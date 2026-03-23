export interface SpeciesListItemDto {
    id: string;
    code?: string | null;
    name?: string | null;
    isActive?: boolean | null;
    displayOrder?: number | null;
}

export interface SpeciesDetailDto {
    id: string;
    code?: string | null;
    name?: string | null;
    isActive?: boolean | null;
    displayOrder?: number | null;
}

export interface SpeciesUpsertRequestDto {
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

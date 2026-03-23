export interface BreedUpsertRequest {
    speciesId: string;
    code: string;
    name: string;
    isActive: boolean;
    displayOrder: number;
}

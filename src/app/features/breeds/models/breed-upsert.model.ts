/** Create (POST): yalnızca `speciesId` + `name` gövdeye gider. `isActive` yoktur. */
export interface BreedUpsertRequest {
    speciesId: string;
    name: string;
    /** Yalnızca güncelleme (PUT); create gövdesinde kullanılmaz. */
    isActive?: boolean;
}

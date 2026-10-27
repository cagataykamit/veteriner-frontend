/**
 * Liste GET `/api/v1/breeds` yanıt öğesi.
 * İstek query (HttpParams): isteğe bağlı `isActive`, `speciesId`, `search` — `breedListQueryToHttpParams`.
 */
export interface BreedListItemDto {
    id: string;
    speciesId?: string | null;
    speciesName?: string | null;
    name?: string | null;
    isActive?: boolean | null;
}

export interface BreedDetailDto {
    id: string;
    speciesId?: string | null;
    speciesCode?: string | null;
    speciesName?: string | null;
    name?: string | null;
    isActive?: boolean | null;
}

export interface BreedCreateRequestDto {
    speciesId: string;
    name: string;
}

export interface BreedUpdateRequestDto {
    id: string;
    name: string;
    isActive: boolean;
}

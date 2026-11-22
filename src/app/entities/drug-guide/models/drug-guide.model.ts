/**
 * İlaç rehberi (REF-001, `docs/LICENSED_DRUG_GUIDE_API_CONTRACT.md`): global, salt okunur ruhsatlı ürün kataloğu.
 * Yalnız olgu alanları; tanı, doz ve tedavi önerisi yok.
 */

export interface ActiveIngredientRef {
    id: string;
    name: string;
}

export interface LicensedProductVm {
    id: string;
    name: string;
    activeIngredients: ActiveIngredientRef[];
    targetSpecies: string[];
    licenseHolder: string;
    licenseNumber: string | null;
    spcUrl: string | null;
    isListedInSource: boolean;
    source: string;
    sourceSyncedAtUtc: string;
}

export interface LicensedProductsPageVm {
    items: LicensedProductVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ActiveIngredientVm {
    id: string;
    name: string;
    productCount: number;
}

export interface DrugGuideSummaryVm {
    productCount: number;
    ingredientCount: number;
    lastSyncedAtUtc: string | null;
}

export interface IngredientStockProductVm {
    productId: string;
    productName: string;
    unit: string;
    isActive: boolean;
    licensedProductId: string;
    licensedProductName: string;
    quantityOnHand: number;
}

/** Reçete ve uygulama satırı bilgisi; `notLicensedForPetSpecies` true ise engellemeyen not gösterilir. */
export interface ProductDrugInfoVm {
    productId: string;
    licensedProductId: string;
    licensedProductName: string;
    activeIngredients: ActiveIngredientRef[];
    targetSpecies: string[];
    notLicensedForPetSpecies: boolean | null;
    petSpeciesName: string | null;
}

export type LicensedProductSearchField = 'All' | 'Product' | 'Ingredient' | 'Holder';

export interface LicensedProductsQuery {
    search?: string;
    field?: LicensedProductSearchField;
    activeIngredientId?: string | null;
    page?: number;
    pageSize?: number;
}

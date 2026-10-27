/** Ürün kategorisi listesi GET parametreleri. */
export interface ProductCategoriesListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
}

/** Ürün listesi GET parametreleri (istemci tarafı). */
export interface ProductsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Backend ile uyumlu; bu MVP’de UI göndermez. */
    productCategoryId?: string;
    /** Tanımlı değil → tümü; true/false → filtre. */
    isActive?: boolean;
    /** İstemcide uygulanır (sunucuda `kind` süzgeci yok): hizmetler (`Service`) sonuçtan çıkarılır. Stok, uygulama, reçete ve satış seçicileri için. */
    stockTrackedOnly?: boolean;
}

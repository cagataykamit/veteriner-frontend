/** GET /stock-movements ve ürün içi liste için ortak filtreler (istemci). */
export interface StockMovementsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    productId?: string;
    productCategoryId?: string;
    /** Kanonik: Initial | In | Out | Adjustment — HTTP’ye mapper çevirir. */
    movementType?: string;
    /** yyyy-mm-dd — mapper ISO UTC aralığına çevirir. */
    dateFromUtc?: string;
    dateToUtc?: string;
}

/** Ürün create/update formundan mapper’a giden düz değerler. */
export interface ProductUpsertFormValue {
    name: string;
    productCategoryId: string;
    sku: string;
    barcode: string;
    unit: string;
    unitPrice: number | null;
    currency: string;
    description: string;
}

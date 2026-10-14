/** Düşük stok kısayolunda önerilen giriş miktarı (sözleşme §5): `max(minimum − kullanılabilir, 0)`; kullanıcı düzenler. */
export function suggestedReceiptQuantity(stock: { minimumStockLevel: number; availableQuantity: number }): number {
    return Math.max(stock.minimumStockLevel - stock.availableQuantity, 0);
}

/** Toplam maliyet: yalnız miktarı ve birim maliyeti dolu satırlar toplanır. */
export function goodsReceiptTotalCost(lines: readonly { quantity: number | null; unitCost: number | null }[]): number {
    return lines.reduce((sum, l) => (l.quantity != null && l.quantity > 0 && l.unitCost != null && l.unitCost >= 0 ? sum + l.quantity * l.unitCost : sum), 0);
}

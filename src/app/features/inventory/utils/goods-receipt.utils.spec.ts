import { HttpErrorResponse } from '@angular/common/http';
import { goodsReceiptTotalCost, suggestedReceiptQuantity } from '@/app/features/inventory/utils/goods-receipt.utils';
import { toGoodsReceiptSubmitError } from '@/app/features/inventory/utils/goods-receipt-error.utils';

describe('suggestedReceiptQuantity', () => {
    it('minimum - kullanılabilir; negatif olamaz', () => {
        expect(suggestedReceiptQuantity({ minimumStockLevel: 10, availableQuantity: 3 })).toBe(7);
        expect(suggestedReceiptQuantity({ minimumStockLevel: 5, availableQuantity: 8 })).toBe(0);
    });
});

describe('goodsReceiptTotalCost', () => {
    it('yalnız miktarı ve birim maliyeti dolu satırları toplar', () => {
        expect(
            goodsReceiptTotalCost([
                { quantity: 2, unitCost: 10.5 },
                { quantity: 3, unitCost: null },
                { quantity: null, unitCost: 4 },
                { quantity: 1, unitCost: 0 }
            ])
        ).toBe(21);
    });
});

describe('toGoodsReceiptSubmitError', () => {
    const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

    it('doğrulama hatasını 0 tabanlı lines[i].alan anahtarından satıra yansıtır', () => {
        const e = toGoodsReceiptSubmitError(http(400, { code: 'Validation.FluentValidation', errors: { 'lines[2].quantity': ['must be > 0'] } }));
        expect(e.lineErrors[2]).toContain('Miktar');
        expect(e.message).toContain('Hiçbir satır kaydedilmedi');
    });

    it('iş kuralı hatasını detail başındaki 1 tabanlı "Satır n:" metninden satıra yansıtır', () => {
        const e = toGoodsReceiptSubmitError(
            http(400, { code: 'StockBatches.LotAndExpiryRequired', detail: 'Satır 3: Aşı ve kontrollü ürünlerde seri/lot no ve son kullanma tarihi zorunludur.' })
        );
        expect(e.lineErrors[2]).toBe('Aşı ve kontrollü ürünlerde seri/lot no ve son kullanma tarihi zorunludur.');
        expect(e.message).toContain('Satır 3');
        expect(e.message).toContain('Hiçbir satır kaydedilmedi');
    });

    it('409 DuplicateRequestId için sade mesaj verir', () => {
        const e = toGoodsReceiptSubmitError(http(409, { code: 'GoodsReceipts.DuplicateRequestId' }));
        expect(e.message).toContain('farklı içerikli');
        expect(e.lineErrors).toEqual({});
    });
});

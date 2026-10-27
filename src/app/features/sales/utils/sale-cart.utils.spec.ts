import type { SaleProductVm } from '@/app/features/sales/models/sale-vm.model';
import { type CartLine, cartLineAmount, cartLineError, cartRequestError, cartTotal, effectivePaymentAmount, newCartLine, paymentError, pickScannedProduct, SALE_MAX_LINES, toCreateSaleRequest } from './sale-cart.utils';

const product = (over: Partial<SaleProductVm> = {}): SaleProductVm => ({
    id: 'p1',
    name: 'Pire kovucu',
    sku: 'PRK-1',
    barcode: '8690001',
    unit: 'adet',
    unitPrice: 45.5,
    currency: 'TRY',
    kind: 'Other',
    controlledClass: 'None',
    ...over
});

const line = (over: Partial<CartLine> = {}): CartLine => ({ ...newCartLine(product(), 'l1'), ...over });
const full = { mode: 'full', method: 'Cash', amount: null } as const;

describe('sale-cart.utils', () => {
    it('yeni satır ürünün fiyatı ve miktar 1 ile başlar, parti otomattır', () => {
        expect(newCartLine(product(), 'k')).toEqual(expect.objectContaining({ quantity: 1, unitPrice: 45.5, batchId: '' }));
    });

    it('satır tutarı miktar × birim fiyatın 2 haneye yuvarlanmışıdır; geçersizde 0', () => {
        expect(cartLineAmount({ quantity: 3, unitPrice: 10.1 })).toBe(30.3);
        expect(cartLineAmount({ quantity: 0.5, unitPrice: 0.05 })).toBe(0.03);
        expect(cartLineAmount({ quantity: null, unitPrice: 10 })).toBe(0);
    });

    it('sepet toplamı kuruş toplamıdır (kayan nokta kayması yok)', () => {
        expect(
            cartTotal([
                { quantity: 1, unitPrice: 0.1 },
                { quantity: 1, unitPrice: 0.2 }
            ])
        ).toBe(0.3);
        expect(cartTotal([])).toBe(0);
    });

    it('satır hatası: miktar, fiyat, ondalık ve üst sınır', () => {
        expect(cartLineError({ quantity: 1, unitPrice: 10 })).toBeNull();
        expect(cartLineError({ quantity: null, unitPrice: 10 })).toContain('Miktar');
        expect(cartLineError({ quantity: 0, unitPrice: 10 })).toContain('Miktar');
        expect(cartLineError({ quantity: 1.0001, unitPrice: 10 })).toContain('ondalıklı');
        expect(cartLineError({ quantity: 100001, unitPrice: 10 })).toContain('Miktar');
        expect(cartLineError({ quantity: 1, unitPrice: 0 })).toContain('Birim fiyat');
        expect(cartLineError({ quantity: 1, unitPrice: 10.123 })).toContain('Birim fiyat');
    });

    it('peşin müşteride ödeme her zaman toplamdır; müşterilide moda göre', () => {
        expect(effectivePaymentAmount(100, true, { mode: 'credit', method: 'Cash', amount: 5 })).toBe(100);
        expect(effectivePaymentAmount(100, false, full)).toBe(100);
        expect(effectivePaymentAmount(100, false, { mode: 'partial', method: 'Card', amount: 40 })).toBe(40);
        expect(effectivePaymentAmount(100, false, { mode: 'credit', method: 'Cash', amount: null })).toBeNull();
    });

    it('kısmi ödeme 0 ile toplam arasında olmalıdır; diğer modlarda hata yok', () => {
        const partial = (amount: number | null) => paymentError(100, false, { mode: 'partial', method: 'Cash', amount });

        expect(partial(40)).toBeNull();
        expect(partial(null)).toContain("0'dan büyük");
        expect(partial(100)).toContain('toplamdan az');
        expect(partial(120)).toContain('toplamdan az');
        expect(paymentError(100, true, { mode: 'partial', method: 'Cash', amount: null })).toBeNull();
        expect(paymentError(100, false, full)).toBeNull();
    });

    it('sepet isteği hatası: boş sepet, çok satır, geçersiz satır, ödeme', () => {
        expect(cartRequestError([], 0, true, full)).toBe('Sepet boş.');
        const many = Array.from({ length: SALE_MAX_LINES + 1 }, (_, i) => line({ key: `k${i}` }));

        expect(cartRequestError(many, 1, true, full)).toContain(String(SALE_MAX_LINES));
        expect(cartRequestError([line({ quantity: null })], 0, true, full)).toContain('Satırlardaki');
        expect(cartRequestError([line()], 45.5, false, { mode: 'partial', method: 'Cash', amount: 100 })).toContain('toplamdan az');
        expect(cartRequestError([line()], 45.5, true, full)).toBeNull();
    });

    describe('pickScannedProduct', () => {
        const a = product({ id: 'a', barcode: '111', sku: 'A-1' });
        const b = product({ id: 'b', barcode: '222', sku: 'B-1' });

        it('barkod veya SKU tam eşleşmesini seçer (büyük/küçük harf duyarsız)', () => {
            expect(pickScannedProduct('222', [a, b])).toBe(b);
            expect(pickScannedProduct('a-1', [a, b])).toBe(a);
        });

        it('kodu dilden bağımsız karşılaştırır: "I" ile "i" eşleşir (tr-TR kuralı "ı" yapardı)', () => {
            const i1 = product({ id: 'i1', barcode: 'MIX-01', sku: 'VIT-I' });
            const other = product({ id: 'o', barcode: '333', sku: 'C-1' });

            expect(pickScannedProduct('mix-01', [i1, other])).toBe(i1);
            expect(pickScannedProduct('vit-i', [i1, other])).toBe(i1);
        });

        it('tam eşleşme yoksa tek sonucu seçer; birden çok belirsiz sonuçta null', () => {
            expect(pickScannedProduct('pire', [a])).toBe(a);
            expect(pickScannedProduct('pire', [a, b])).toBeNull();
            expect(pickScannedProduct('', [a])).toBeNull();
            expect(pickScannedProduct('x', [])).toBeNull();
        });

        it('tam eşleşme varken tek olmayan sonuç listesinde diğerini seçmez', () => {
            expect(pickScannedProduct('999', [a, b])).toBeNull();
        });
    });

    describe('toCreateSaleRequest', () => {
        const base = { clinicId: 'c1', notes: '  ', requestId: 'rid-1' };

        it('peşin müşteri: clientId yok, tam ödeme gönderilir, boş not atılır', () => {
            const req = toCreateSaleRequest({ ...base, clientId: '', lines: [line({ quantity: 2, unitPrice: 10 })], payment: { mode: 'credit', method: 'Card', amount: null } });

            expect(req).toEqual({
                clinicId: 'c1',
                clientId: undefined,
                requestId: 'rid-1',
                notes: undefined,
                lines: [{ productId: 'p1', quantity: 2, unitPrice: 10, batchId: undefined }],
                payment: { method: 'Card', amount: 20 }
            });
        });

        it('müşterili veresiye: ödeme gönderilmez; parti seçiliyse batchId gider', () => {
            const req = toCreateSaleRequest({ ...base, clientId: 'cl1', lines: [line({ batchId: 'b9' })], payment: { mode: 'credit', method: 'Cash', amount: null } });

            expect(req.clientId).toBe('cl1');
            expect(req.payment).toBeUndefined();
            expect(req.lines[0].batchId).toBe('b9');
        });

        it('müşterili kısmi ödeme: girilen tutar gider', () => {
            const req = toCreateSaleRequest({ ...base, clientId: 'cl1', lines: [line({ quantity: 2, unitPrice: 10 })], payment: { mode: 'partial', method: 'Transfer', amount: 5 } });

            expect(req.payment).toEqual({ method: 'Transfer', amount: 5 });
        });
    });
});

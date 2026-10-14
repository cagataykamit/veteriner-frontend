import { isStockTrackedKind, productKindFromApi, productKindLabel, productKindOptionsFor, productRequiresLotAndExpiry } from './product-classification.utils';

describe('product-classification.utils (hizmet türü)', () => {
    it('Service türü tanınır ve "Hizmet" etiketi taşır; bilinmeyen değer Other olur', () => {
        expect(productKindFromApi('Service')).toBe('Service');
        expect(productKindLabel('Service')).toBe('Hizmet');
        expect(productKindFromApi('Whatever')).toBe('Other');
    });

    it('hizmet stok takipli değildir ve lot/SKT istemez', () => {
        expect(isStockTrackedKind('Service')).toBeFalse();
        expect(isStockTrackedKind('Medicine')).toBeTrue();
        expect(productRequiresLotAndExpiry('Service', 'None')).toBeFalse();
    });

    it('yeni kayıtta tüm türler seçilebilir', () => {
        expect(productKindOptionsFor(null).map((o) => o.value)).toEqual(['Other', 'Medicine', 'Vaccine', 'Service']);
    });

    it('düzenlemede hizmete veya hizmetten tür değişimi sunulmaz', () => {
        expect(productKindOptionsFor('Medicine').map((o) => o.value)).toEqual(['Other', 'Medicine', 'Vaccine']);
        expect(productKindOptionsFor('Service').map((o) => o.value)).toEqual(['Service']);
    });
});

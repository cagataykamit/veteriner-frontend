import { mapProductUpsertFormValueToCreateRequest, mapProductUpsertFormValueToUpdateRequest } from './product.mapper';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';

const form = (over: Partial<ProductUpsertFormValue> = {}): ProductUpsertFormValue => ({
    name: ' Genel muayene ',
    productCategoryId: '',
    sku: '',
    barcode: '',
    unit: 'Adet',
    unitPrice: 750,
    currency: 'TRY',
    description: '',
    kind: 'Service',
    controlledClass: 'None',
    pharmacologicalForm: '',
    presentationForm: '',
    packaging: '',
    ...over
});

describe('product.mapper hizmet türü', () => {
    it('hizmet isteği kind Service, fiyat ve birimle gider', () => {
        const req = mapProductUpsertFormValueToCreateRequest(form());
        expect(req).toEqual(jasmine.objectContaining({ name: 'Genel muayene', kind: 'Service', unit: 'Adet', unitPrice: 750, controlledClass: 'None' }));
    });

    it('hizmette gizli sınıflandırma alanlarında eski değer kalsa bile gönderilmez', () => {
        const req = mapProductUpsertFormValueToCreateRequest(form({ controlledClass: 'Narcotic', pharmacologicalForm: 'Çözelti', packaging: 'Flakon' }));
        expect(req.controlledClass).toBe('None');
        expect(req.pharmacologicalForm).toBeNull();
        expect(req.packaging).toBeNull();
        const upd = mapProductUpsertFormValueToUpdateRequest(form({ pharmacologicalForm: 'Çözelti' }));
        expect(upd.pharmacologicalForm).toBe('');
    });

    it('hizmet dışı ürünün sınıflandırması korunur', () => {
        const req = mapProductUpsertFormValueToCreateRequest(form({ kind: 'Medicine', controlledClass: 'Narcotic', packaging: ' 10 ml ' }));
        expect(req.controlledClass).toBe('Narcotic');
        expect(req.packaging).toBe('10 ml');
    });

    it('fiyat zorunludur', () => {
        expect(() => mapProductUpsertFormValueToCreateRequest(form({ unitPrice: null }))).toThrowError('PRODUCT_UPSERT_UNIT_PRICE_REQUIRED');
    });
});

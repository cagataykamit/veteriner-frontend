import { mapProductDtoToDetailVm, mapProductDtoToUpsertFormValue, mapProductUpsertFormValueToCreateRequest, mapProductUpsertFormValueToUpdateRequest, productsQueryToHttpParams } from './product.mapper';
import type { ProductUpsertFormValue } from '@/app/entities/inventory/models/product-upsert-form.model';

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
    manufacturer: '',
    vatRate: null,
    purchasePrice: null,
    ...over
});

describe('product.mapper hizmet türü', () => {
    it('hizmet isteği kind Service, fiyat ve birimle gider', () => {
        const req = mapProductUpsertFormValueToCreateRequest(form());

        expect(req).toEqual(expect.objectContaining({ name: 'Genel muayene', kind: 'Service', unit: 'Adet', unitPrice: 750, controlledClass: 'None' }));
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
        expect(req.manufacturer).toBeNull();
    });

    it('fiyat zorunludur', () => {
        expect(() => mapProductUpsertFormValueToCreateRequest(form({ unitPrice: null }))).toThrowError('PRODUCT_UPSERT_UNIT_PRICE_REQUIRED');
    });
});

describe('product.mapper üretici (RECORD-005)', () => {
    it('oluşturmada kırpılır, boşsa null; güncellemede boşaltma "" ile temizler', () => {
        expect(mapProductUpsertFormValueToCreateRequest(form({ kind: 'Vaccine', manufacturer: ' Vetaş ' })).manufacturer).toBe('Vetaş');
        expect(mapProductUpsertFormValueToCreateRequest(form({ kind: 'Vaccine' })).manufacturer).toBeNull();
        expect(mapProductUpsertFormValueToUpdateRequest(form({ kind: 'Vaccine' })).manufacturer).toBe('');
    });

    it('hizmette üretici gönderilmez', () => {
        expect(mapProductUpsertFormValueToCreateRequest(form({ manufacturer: 'X' })).manufacturer).toBeNull();
    });
});

describe('product.mapper KDV oranı ve alış fiyatı (§2.1)', () => {
    it('oluşturmada değer olduğu gibi, boşsa null gider (klinik varsayılanı)', () => {
        expect(mapProductUpsertFormValueToCreateRequest(form({ vatRate: 10, purchasePrice: 42.5 }))).toEqual(expect.objectContaining({ vatRate: 10, purchasePrice: 42.5 }));
        expect(mapProductUpsertFormValueToCreateRequest(form())).toEqual(expect.objectContaining({ vatRate: null, purchasePrice: null }));
        expect(mapProductUpsertFormValueToCreateRequest(form())).not.toHaveProperty('clearVatRate');
    });

    it('güncellemede dolu alan değerle, clear false gider', () => {
        const upd = mapProductUpsertFormValueToUpdateRequest(form({ vatRate: 0, purchasePrice: 0 }));

        expect(upd).toEqual(expect.objectContaining({ vatRate: 0, purchasePrice: 0, clearVatRate: false, clearPurchasePrice: false }));
    });

    it('güncellemede boşaltılan alan null + clear true ile temizlenir', () => {
        const upd = mapProductUpsertFormValueToUpdateRequest(form({ vatRate: null, purchasePrice: null }));

        expect(upd).toEqual(expect.objectContaining({ vatRate: null, purchasePrice: null, clearVatRate: true, clearPurchasePrice: true }));
    });

    it('detay DTO forma ve görünüme eşlenir', () => {
        const dto = { id: 'p1', name: 'Serum', unitPrice: 100, vatRate: 18, purchasePrice: 60.25 };

        expect(mapProductDtoToUpsertFormValue(dto)).toEqual(expect.objectContaining({ vatRate: 18, purchasePrice: 60.25 }));
        expect(mapProductDtoToDetailVm(dto).vatRateLabel).toBe('%18');
        expect(mapProductDtoToDetailVm(dto).purchasePriceText).toContain('60,25');
        expect(mapProductDtoToDetailVm({ id: 'p2', vatRate: null, purchasePrice: null })).toEqual(expect.objectContaining({ vatRateLabel: 'Klinik varsayılanı', purchasePriceText: '—' }));
    });
});

describe('productsQueryToHttpParams barkod', () => {
    it('barkod tam eşleşme parametresi olarak kırpılıp gider; boşsa gönderilmez', () => {
        expect(productsQueryToHttpParams({ barcode: ' 8690001 ', isActive: true }).get('Barcode')).toBe('8690001');
        expect(productsQueryToHttpParams({ barcode: '  ' }).has('Barcode')).toBe(false);
    });
});

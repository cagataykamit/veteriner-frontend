import { FormBuilder } from '@angular/forms';
import { mapProductUpsertFormValueToCreateRequest, mapProductUpsertFormValueToUpdateRequest } from '@/app/features/inventory/data/product.mapper';
import { mapStockMovementUpsertFormValueToCreateRequest } from '@/app/features/inventory/data/stock-movement.mapper';
import {
    applyStockBatchRequirement,
    createStockBatchFormGroup,
    getAcknowledgeExpiredRequest,
    getStockBatchRequest,
    syncStockBatchGroup
} from '@/app/features/inventory/forms/stock-batch-form.factory';
import { createStockMovementFormGroup, getStockMovementFormValue } from '@/app/features/inventory/forms/stock-movement-form.factory';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';
import { productRequiresLotAndExpiry } from '@/app/features/inventory/utils/product-classification.utils';

describe('stock batch form', () => {
    const fb = new FormBuilder();

    it('hiç alan doluyken batch null (partisiz giriş)', () => {
        expect(getStockBatchRequest(createStockBatchFormGroup(fb))).toBeNull();
    });

    it('dolu alanlar kırpılır, boşlar null olur', () => {
        const g = createStockBatchFormGroup(fb);
        g.patchValue({ lotNumber: ' L-1 ', expiryDate: '2027-01-31', supplierName: 'Vet İlaç' });
        expect(getStockBatchRequest(g)).toEqual(
            jasmine.objectContaining({ lotNumber: 'L-1', expiryDate: '2027-01-31', supplierName: 'Vet İlaç', invoiceNumber: null, coldChainMonitor: null })
        );
    });

    it('zorunlu üründe seri no ve SKT boşsa geçersiz; zorunluluk kalkınca geçerli', () => {
        const g = createStockBatchFormGroup(fb);
        applyStockBatchRequirement(g, true);
        expect(g.controls.lotNumber.hasError('required')).toBeTrue();
        expect(g.controls.expiryDate.hasError('required')).toBeTrue();
        g.patchValue({ lotNumber: 'L', expiryDate: '2027-01-01' });
        expect(g.valid).toBeTrue();
        applyStockBatchRequirement(g, false);
        g.patchValue({ lotNumber: '', expiryDate: '' });
        expect(g.valid).toBeTrue();
    });

    it('SKT geçmişse onay kutusu işaretlenmeden geçersiz; onayla geçerli ve istek bayrağı eklenir', () => {
        const g = createStockBatchFormGroup(fb);
        g.patchValue({ lotNumber: 'L', expiryDate: '2020-01-01' });
        expect(g.hasError('expiredNotAcknowledged')).toBeTrue();
        expect(getAcknowledgeExpiredRequest(g)).toEqual({});
        g.patchValue({ acknowledgeExpired: true });
        expect(g.valid).toBeTrue();
        expect(getAcknowledgeExpiredRequest(g)).toEqual({ acknowledgeExpired: true });
        g.patchValue({ expiryDate: '2999-01-01' });
        expect(getAcknowledgeExpiredRequest(g)).toEqual({});
    });

    it('depo çıkış tarihi geliş tarihinden sonraysa geçersiz', () => {
        const g = createStockBatchFormGroup(fb);
        g.patchValue({ receivedDate: '2026-10-10', dispatchedDate: '2026-10-11' });
        expect(g.hasError('dispatchedAfterReceived')).toBeTrue();
        g.patchValue({ dispatchedDate: '2026-10-09' });
        expect(g.valid).toBeTrue();
    });

    it('stok girişi dışında parti bloğu pasif olur ve doğrulamayı etkilemez', () => {
        const g = createStockBatchFormGroup(fb);
        syncStockBatchGroup(g, { active: false, required: true });
        expect(g.disabled).toBeTrue();
        expect(g.valid).toBeFalse(); // pasif grup `invalid` değildir ama `valid` de değildir
        expect(g.invalid).toBeFalse();
        syncStockBatchGroup(g, { active: true, required: true });
        expect(g.invalid).toBeTrue();
    });

    it('sınıfa göre zorunluluk: aşı veya kontrollü ürün', () => {
        expect(productRequiresLotAndExpiry('Vaccine', 'None')).toBeTrue();
        expect(productRequiresLotAndExpiry('Medicine', 'Narcotic')).toBeTrue();
        expect(productRequiresLotAndExpiry('Other', 'Psychotropic')).toBeTrue();
        expect(productRequiresLotAndExpiry('Medicine', 'None')).toBeFalse();
        expect(productRequiresLotAndExpiry('Other', 'None')).toBeFalse();
    });

    it('stok hareketi isteğine yalnız girişte batch ve requestId girer', () => {
        const form = createStockMovementFormGroup(fb);
        form.patchValue({ clinicId: 'c', productId: 'p', movementType: 'In', quantity: 5 });
        form.controls.batch.patchValue({ lotNumber: 'L-9', expiryDate: '2027-05-01' });
        const entry = mapStockMovementUpsertFormValueToCreateRequest(getStockMovementFormValue(form, 'rid-1'));
        expect(entry.requestId).toBe('rid-1');
        expect(entry.batch).toEqual(jasmine.objectContaining({ lotNumber: 'L-9', expiryDate: '2027-05-01' }));

        form.patchValue({ movementType: 'Out' });
        const out = mapStockMovementUpsertFormValueToCreateRequest(getStockMovementFormValue(form, 'rid-2'));
        expect('batch' in out).toBeFalse();
    });
});

describe('ürün isteği (sınıf alanları)', () => {
    const value: ProductUpsertFormValue = {
        name: 'Nobivac',
        productCategoryId: '',
        sku: '',
        barcode: '',
        unit: 'doz',
        unitPrice: 10,
        currency: 'TRY',
        description: '',
        kind: 'Vaccine',
        controlledClass: 'None',
        pharmacologicalForm: '  Süspansiyon ',
        presentationForm: '',
        packaging: ''
    };

    it('oluşturmada boş metin null, sınıf alanları string enum olarak gider', () => {
        const req = mapProductUpsertFormValueToCreateRequest(value);
        expect(req.kind).toBe('Vaccine');
        expect(req.controlledClass).toBe('None');
        expect(req.pharmacologicalForm).toBe('Süspansiyon');
        expect(req.presentationForm).toBeNull();
    });

    it('güncellemede boşaltılan metin "" ile temizlenir (null dokunmaz)', () => {
        const req = mapProductUpsertFormValueToUpdateRequest(value);
        expect(req.presentationForm).toBe('');
        expect(req.packaging).toBe('');
    });
});

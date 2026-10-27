import type { AdministrationCreateResultVm } from '@/app/entities/administration/models/administration-vm.model';
import { administrationSavedNotice } from '@/app/entities/administration/utils/administration-labels';

const result = (created: boolean, isBelowMinimum: boolean): AdministrationCreateResultVm => ({
    created,
    administration: {
        id: 'a1',
        petId: 'p1',
        examinationId: null,
        treatmentId: null,
        productId: 'pr1',
        productName: 'Nobivac',
        productSku: null,
        unit: 'doz',
        quantity: 1,
        administeredAtUtc: '2026-10-14T08:00:00Z',
        notes: null,
        isVoided: false,
        voidedAtUtc: null,
        voidReason: null,
        voidStockOutcome: null,
        addedAfterFinalization: false,
        lateEntryReason: null,
        createdAtUtc: '2026-10-14T08:00:00Z',
        batchId: null,
        lotNumber: null,
        expiryDate: null,
        vaccinationId: null
    },
    stock: { quantityOnHand: 3, availableQuantity: 2, minimumStockLevel: 5, isBelowMinimum }
});

describe('administrationSavedNotice', () => {
    it('yeni kayıtta kalan stoğu söyler', () => {
        expect(administrationSavedNotice(result(true, false), 'Aşı')).toEqual({ text: 'Aşı kaydedildi; kalan kullanılabilir stok 2 doz.', warn: false });
    });

    it('minimum altında uyarı verir', () => {
        const n = administrationSavedNotice(result(true, true), 'Uygulama');

        expect(n.warn).toBe(true);
        expect(n.text).toContain('minimum düzeyin altına indi');
    });

    it('aynı requestId tekrarında stok tekrar düşülmediğini söyler', () => {
        expect(administrationSavedNotice(result(false, false), 'Aşı').text).toBe('Bu aşı zaten kaydedilmişti; stok tekrar düşülmedi.');
    });
});

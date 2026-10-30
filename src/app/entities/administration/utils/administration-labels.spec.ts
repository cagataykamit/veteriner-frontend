import type { AdministrationCreateResultVm } from '@/app/entities/administration/models/administration-vm.model';
import { administrationBatchText, administrationBillingVm, administrationSavedNotice } from '@/app/entities/administration/utils/administration-labels';

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
        vaccinationId: null,
        route: null,
        site: null,
        productManufacturer: null,
        billing: null
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

describe('administrationBatchText (RECORD-005)', () => {
    it('üretici, seri no ve SKT tek satırda; hiçbiri yoksa null', () => {
        expect(administrationBatchText({ productManufacturer: 'MSD', lotNumber: 'L1', expiryDate: '2027-03-31' })).toBe('Üretici: MSD · Seri: L1 · SKT: 31.03.2027');
        expect(administrationBatchText({ productManufacturer: null, lotNumber: null, expiryDate: null })).toBeNull();
    });
});

describe('administrationBillingVm (RECORD-001)', () => {
    it('ücret durumunu satır metnine çevirir; bekleyen kalem uyarı renginde', () => {
        expect(administrationBillingVm({ status: 'Pending', suggestedAmount: 500 })).toEqual({ text: expect.stringContaining('Ücret bekliyor: '), pending: true });
        expect(administrationBillingVm({ status: 'Pending' })).toEqual({ text: 'Ücret bekliyor', pending: true });
        expect(administrationBillingVm({ status: 'Charged', chargeAmount: 450 })?.text).toContain('Ücret kesildi: ');
        expect(administrationBillingVm({ status: 'ChargeVoided', chargeAmount: 450 })?.text).toContain('Ücret kaydı iptal edildi');
        expect(administrationBillingVm({ status: 'Waived', waiveReason: 'Kontrol' })).toEqual({ text: 'Ücretsiz sayıldı: Kontrol', pending: false });
    });

    it('kalem yoksa, düştüyse veya finans izni yoksa satırda ücret yok', () => {
        expect(administrationBillingVm({ status: 'None' })).toBeNull();
        expect(administrationBillingVm({ status: 'Cancelled' })).toBeNull();
        expect(administrationBillingVm(null)).toBeNull();
    });
});

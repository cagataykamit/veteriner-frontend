import { mapCreatePrescriptionToApiBody, mapPrescriptionDetailDtoToEditVm, mapPrescriptionDetailDtoToVm, prescriptionsQueryToHttpParams } from '@/app/entities/prescription/data/prescription.mapper';
import { createPrescriptionItemsArray, prescriptionItemsFormToInputs } from '@/app/entities/prescription/utils/prescription-items-form.utils';

describe('prescription mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [dateFromUtc, dateToUtc] olarak gönderir', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });

        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın reçete doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);

        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });

        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });

        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate']) {
            expect(withDates.has(k)).toBe(false);
        }

        const none = prescriptionsQueryToHttpParams({});

        expect(none.has('dateFromUtc')).toBe(false);
        expect(none.has('dateToUtc')).toBe(false);
    });

    it('yalnızca bitiş verilirse yalnızca dateToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = prescriptionsQueryToHttpParams({ toDate: '2026-10-08' });

        expect(onlyTo.has('dateFromUtc')).toBe(false);
        expect(onlyTo.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = prescriptionsQueryToHttpParams({ fromDate: 'abc', toDate: '  ' });

        expect(invalid.has('dateFromUtc')).toBe(false);
        expect(invalid.has('dateToUtc')).toBe(false);
    });
});

describe('prescription mapper — iptal, sonradan ekleme, kararlı satır kimliği (RECORD-008)', () => {
    const base = { clinicId: 'c1', petId: 'p1', prescribedAtUtc: '2026-10-30T07:00:00Z', title: 'Reçete', content: 'İçerik' };

    it('detayda iptal ve sonradan ekleme alanları taşınır; düzenleme modeli iptali bilir', () => {
        const dto = { id: 'r1', status: 'Cancelled', cancelReason: ' Yanlış hasta ', cancelledByName: 'Dr. Ayşe', addedAfterFinalization: true, lateEntryReason: 'Sonra yazıldı' };
        const vm = mapPrescriptionDetailDtoToVm(dto);

        expect(vm.isCancelled).toBe(true);
        expect(vm.cancelReason).toBe('Yanlış hasta');
        expect(vm.addedAfterFinalization).toBe(true);
        expect(mapPrescriptionDetailDtoToEditVm(dto).isCancelled).toBe(true);
        expect(mapPrescriptionDetailDtoToVm({ id: 'r2', status: 'Active' }).isCancelled).toBe(false);
    });

    it('düzenlemede mevcut satır kimliği gönderilir, yeni satırda gönderilmez; gerekçe yalnız doluysa gider', () => {
        const items = createPrescriptionItemsArray([{ id: 'i1', name: 'Amoksisilin', productId: null, instructions: '', quantity: 2, dose: '', unit: '', lotNumber: '' }]);
        const body = mapCreatePrescriptionToApiBody({ ...base, items: [...prescriptionItemsFormToInputs(items), { name: 'Yeni' }] });

        expect(body.items?.[0].id).toBe('i1');
        expect(body.items?.[1]).not.toHaveProperty('id');
        expect(body).not.toHaveProperty('lateEntryReason');
        expect(mapCreatePrescriptionToApiBody({ ...base, lateEntryReason: ' Sonra yazıldı ' }).lateEntryReason).toBe('Sonra yazıldı');
    });
});

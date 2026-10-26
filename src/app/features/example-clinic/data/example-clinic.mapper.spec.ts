import type { ExampleClinicDataCountsDto, ExampleClinicLoadSummaryDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { exampleClinicDeactivatedProducts, exampleClinicOtherRecords, exampleClinicSummaryShortText, mapExampleClinicSummaryToRows } from './example-clinic.mapper';

const SUMMARY: ExampleClinicLoadSummaryDto = {
    tenantId: 't1',
    clinicId: 'c1',
    clients: 12,
    pets: 20,
    appointments: 38,
    examinations: 26,
    vaccinations: 14,
    treatments: 9,
    labResults: 5,
    charges: 48,
    payments: 19,
    products: 10,
    stockMovements: 29
};

describe('example-clinic.mapper (TRIAL-002)', () => {
    it('özet gövdesini sözleşme sırasıyla kart satırlarına çevirir', () => {
        const rows = mapExampleClinicSummaryToRows(SUMMARY);

        expect(rows.map((r) => r.key)).toEqual(['clients', 'pets', 'appointments', 'examinations', 'vaccinations', 'treatments', 'labResults', 'charges', 'payments', 'products', 'stockMovements']);
        expect(rows.find((r) => r.key === 'pets')).toEqual({ key: 'pets', label: 'Hasta', count: 20 });
        expect(rows.find((r) => r.key === 'stockMovements')?.label).toBe('Stok hareketi');
    });

    it('eksik ya da geçersiz sayıyı 0 gösterir', () => {
        const partial = { ...SUMMARY, pets: undefined, charges: -3, payments: Number.NaN } as unknown as ExampleClinicLoadSummaryDto;
        const rows = mapExampleClinicSummaryToRows(partial);

        expect(rows.find((r) => r.key === 'pets')?.count).toBe(0);
        expect(rows.find((r) => r.key === 'charges')?.count).toBe(0);
        expect(rows.find((r) => r.key === 'payments')?.count).toBe(0);
        expect(rows.find((r) => r.key === 'clients')?.count).toBe(12);
    });

    it('toast için kısa metin üretir', () => {
        expect(exampleClinicSummaryShortText(SUMMARY)).toBe('12 müşteri, 20 hasta, 38 randevu');
    });

    it('temizlik sayılarını da aynı satırlara çevirir; pasif ürün ve diğer kayıtlar ayrı okunur', () => {
        const counts: ExampleClinicDataCountsDto = { ...SUMMARY, products: 9, productsDeactivated: 1, otherRecords: 3 };

        expect(mapExampleClinicSummaryToRows(counts).find((r) => r.key === 'products')?.count).toBe(9);
        expect(exampleClinicDeactivatedProducts(counts)).toBe(1);
        expect(exampleClinicOtherRecords(counts)).toBe(3);
        expect(exampleClinicOtherRecords({ ...counts, otherRecords: Number.NaN })).toBe(0);
    });
});

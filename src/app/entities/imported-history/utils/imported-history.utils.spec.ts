import type { ImportedClinicalRecordDto } from '@/app/entities/imported-history/models/imported-history.model';
import { formatImportedDate, importedRecordFields, importedRecordSummary, importedRecordTypeLabel } from '@/app/entities/imported-history/utils/imported-history.utils';

const record = (over: Partial<ImportedClinicalRecordDto> = {}): ImportedClinicalRecordDto => ({
    id: 'r1',
    recordedOn: '2024-05-03',
    recordType: null,
    complaint: null,
    history: null,
    findings: null,
    diagnosis: null,
    treatment: null,
    prescription: null,
    labResults: null,
    notes: null,
    veterinarianName: null,
    weightKg: null,
    temperatureC: null,
    clinicId: 'k1',
    importBatchId: 'b1',
    createdAtUtc: '2026-11-10T10:00:00Z',
    ...over
});

describe('imported-history.utils', () => {
    it('yalnız tarihi saat dilimine çevirmeden gg.aa.yyyy yazar', () => {
        expect(formatImportedDate('2024-05-03')).toBe('03.05.2024');
        expect(formatImportedDate(null)).toBe('—');
    });

    it('boş kayıt türü "Muayene" görünür', () => {
        expect(importedRecordTypeLabel(record())).toBe('Muayene');
        expect(importedRecordTypeLabel(record({ recordType: ' Ameliyat ' }))).toBe('Ameliyat');
    });

    it('özet önce tanı, sonra şikâyet; alanlar boşları atlar', () => {
        expect(importedRecordSummary(record({ complaint: 'Kusma', diagnosis: 'Gastrit' }))).toBe('Gastrit');
        expect(importedRecordSummary(record({ complaint: 'Kusma' }))).toBe('Kusma');
        expect(importedRecordSummary(record({ notes: 'Kontrole gelecek' }))).toBe('Kontrole gelecek');
        expect(importedRecordFields(record({ complaint: 'Kusma', prescription: ' ', treatment: 'Serum' })).map((f) => f.label)).toEqual(['Şikâyet', 'Tedavi']);
    });
});

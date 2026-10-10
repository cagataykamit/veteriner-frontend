import { mapPetAlertsDtoToVm, NO_PET_ALERTS, petAlertsFormToWrite, petAlertsSummary } from '@/app/shared/pet-alerts/pet-alerts.utils';

describe('pet alerts utils', () => {
    it('DTO: bilinmeyen bayrak yok sayılır, sıra sözleşme sırasıdır; null/boş güvenli', () => {
        expect(mapPetAlertsDtoToVm({ flags: ['AnesthesiaRisk', 'Bilinmeyen', 'Allergy'], note: ' Penisilin ' })).toEqual({
            flags: ['Allergy', 'AnesthesiaRisk'],
            note: 'Penisilin'
        });
        expect(mapPetAlertsDtoToVm(null)).toEqual(NO_PET_ALERTS);
        expect(mapPetAlertsDtoToVm({ flags: [], note: 'yetim not' })).toEqual(NO_PET_ALERTS);
    });

    it('özet: etiketler ve not; uyarı yoksa null', () => {
        expect(petAlertsSummary({ flags: ['Allergy', 'Aggressive'], note: 'Penisilin' })).toBe('Alerji, Agresif — Penisilin');
        expect(petAlertsSummary({ flags: ['ChronicCondition'], note: null })).toBe('Kronik hastalık');
        expect(petAlertsSummary(NO_PET_ALERTS)).toBeNull();
    });

    it('yazma: yüklenen değer aynen geri gider; bayraksız not temizlenir; tüm bayrak kaldırma [] gönderir', () => {
        expect(petAlertsFormToWrite(['Aggressive', 'Allergy'], '  Isırır ')).toEqual({ alertFlags: ['Allergy', 'Aggressive'], alertNote: 'Isırır' });
        expect(petAlertsFormToWrite([], 'kalan not')).toEqual({ alertFlags: [], alertNote: '' });
    });
});

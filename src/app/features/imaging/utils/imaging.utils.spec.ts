import { imagingAltText, imagingModalityLabel, imagingQueryToHttpParams } from './imaging.utils';

describe('imaging.utils', () => {
    it('sorgu parametreleri: boşlar gönderilmez, tarih İstanbul günü sınırlarıyla UTC', () => {
        const p = imagingQueryToHttpParams({ page: 2, pageSize: 20, petId: ' pet-1 ', modality: 'XRay', fromDate: '2026-10-22', toDate: '2026-10-22', search: ' ' });

        expect(p.get('Page')).toBe('2');
        expect(p.get('PetId')).toBe('pet-1');
        expect(p.get('Modality')).toBe('XRay');
        expect(p.get('dateFromUtc')).toBe('2026-10-21T21:00:00.000Z');
        expect(p.get('dateToUtc')).toMatch(/^2026-10-22T20:59:59/);
        expect(p.has('Search')).toBe(false);
        expect(p.has('Status')).toBe(false);
    });

    it('tür etiketi ve alt metin', () => {
        expect(imagingModalityLabel('ClinicalPhoto')).toBe('Klinik fotoğraf');
        expect(imagingModalityLabel('Bilinmeyen')).toBe('Görüntüleme');
        expect(imagingAltText('XRay', null)).toBe('Röntgen');
    });
});

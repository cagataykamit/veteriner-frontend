import { appendClinicalTermToText } from './clinical-term-text.utils';

describe('appendClinicalTermToText', () => {
    it('boş alana adın kendisini yazar', () => {
        expect(appendClinicalTermToText('', 'İshal')).toBe('İshal');
        expect(appendClinicalTermToText('  \n', 'İshal')).toBe('İshal');
    });

    it('dolu alanın sonuna virgülle ekler; sondaki ayırıcıyı tekrarlamaz', () => {
        expect(appendClinicalTermToText('Kusma', 'İshal')).toBe('Kusma, İshal');
        expect(appendClinicalTermToText('Kusma,  ', 'İshal')).toBe('Kusma, İshal');
        expect(appendClinicalTermToText('Kusma;', 'İshal')).toBe('Kusma; İshal');
    });

    it('ad zaten ayrı bir parça olarak varsa (Türkçe büyük/küçük harf duyarsız) metni değiştirmez', () => {
        expect(appendClinicalTermToText('Kusma, İSHAL', 'ishal')).toBe('Kusma, İSHAL');
        expect(appendClinicalTermToText('Kanlı ishal', 'İshal')).toBe('Kanlı ishal, İshal');
    });

    it('boş adı yok sayar', () => {
        expect(appendClinicalTermToText('Kusma', '  ')).toBe('Kusma');
    });
});

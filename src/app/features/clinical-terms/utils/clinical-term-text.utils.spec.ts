import { appendClinicalTermToText, clinicalTermNameKey } from './clinical-term-text.utils';

describe('clinicalTermNameKey', () => {
    it('sunucu mükerrer kuralı gibi harf, Türkçe karakter ve boşluk farkını yok sayar', () => {
        expect(clinicalTermNameKey('  KANLI   İshal ')).toBe('kanli ishal');
        expect(clinicalTermNameKey('kanli ishal')).toBe(clinicalTermNameKey('Kanlı İSHAL'));
        expect(clinicalTermNameKey('Çğöşü âîû')).toBe('cgosu aiu');
        expect(clinicalTermNameKey('GASTROENTERİT')).toBe(clinicalTermNameKey('Gastroenterit'));
    });

    it('farklı adları ayırır', () => {
        expect(clinicalTermNameKey('ishal')).not.toBe(clinicalTermNameKey('Kanlı ishal'));
    });
});

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

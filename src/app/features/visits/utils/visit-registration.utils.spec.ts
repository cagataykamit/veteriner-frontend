import { samePhone, splitSearchTermForRegistration } from '@/app/features/visits/utils/visit-registration.utils';

describe('splitSearchTermForRegistration', () => {
    it('telefon biçimindeki metin telefona gider', () => {
        expect(splitSearchTermForRegistration(' 0532 123 45 67 ')).toEqual({ fullName: '', phone: '0532 123 45 67' });
        expect(splitSearchTermForRegistration('+90 (532) 123-45-67')).toEqual({ fullName: '', phone: '+90 (532) 123-45-67' });
    });

    it('harf içeren metin sahip adına gider', () => {
        expect(splitSearchTermForRegistration('Ayşe Yılmaz')).toEqual({ fullName: 'Ayşe Yılmaz', phone: '' });
        expect(splitSearchTermForRegistration('985 abc')).toEqual({ fullName: '985 abc', phone: '' });
    });

    it('boş veya yalnızca noktalama boşsa ad/telefon boş kalır', () => {
        expect(splitSearchTermForRegistration('   ')).toEqual({ fullName: '', phone: '' });
        expect(splitSearchTermForRegistration('...')).toEqual({ fullName: '...', phone: '' });
    });
});

describe('samePhone', () => {
    it('farklı biçimler aynı numarayı eşleştirir', () => {
        expect(samePhone('0532 123 45 67', '+90 532 123 45 67')).toBeTrue();
        expect(samePhone('905321234567', '(0532) 123-45-67')).toBeTrue();
    });

    it('farklı numara, kısa numara ve boş değer eşleşmez', () => {
        expect(samePhone('0532 123 45 67', '0532 123 45 68')).toBeFalse();
        expect(samePhone('532 123', '532 123')).toBeFalse();
        expect(samePhone(null, undefined)).toBeFalse();
    });
});

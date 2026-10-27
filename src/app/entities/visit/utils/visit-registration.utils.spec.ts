import { splitSearchTermForRegistration } from '@/app/entities/visit/utils/visit-registration.utils';

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

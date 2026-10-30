import { quickClientPrefill } from './quick-client-prefill.utils';

describe('quickClientPrefill (APPT-017/019)', () => {
    it('ad gibi metni ad soyada taşır', () => {
        expect(quickClientPrefill('  Ayşe Yılmaz ')).toEqual({ fullName: 'Ayşe Yılmaz', phone: '' });
    });

    it('telefon gibi metni telefona taşır', () => {
        expect(quickClientPrefill('0532 111 22 33')).toEqual({ fullName: '', phone: '0532 111 22 33' });
        expect(quickClientPrefill('+90 (532) 111-2233')).toEqual({ fullName: '', phone: '+90 (532) 111-2233' });
    });

    it('kısa sayı veya karışık metin ad sayılır; boş metin boş form verir', () => {
        expect(quickClientPrefill('123')).toEqual({ fullName: '123', phone: '' });
        expect(quickClientPrefill('Mehmet 0532')).toEqual({ fullName: 'Mehmet 0532', phone: '' });
        expect(quickClientPrefill(null)).toEqual({ fullName: '', phone: '' });
    });
});

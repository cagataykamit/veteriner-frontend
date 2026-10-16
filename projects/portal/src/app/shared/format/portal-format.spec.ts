import { formatPortalCalendarDate, formatPortalClock, formatPortalDay, formatPortalTime, formatPortalWeekday } from './portal-date';
import { appointmentStatus, paymentMethodLabel, telHref } from './portal-labels';
import { formatPortalMoney, formatPortalWeight } from './portal-money';

describe('Portal biçimleri (tarih, para, etiket)', () => {
    it('Z\'siz UTC tarihini UTC kabul edip İstanbul günüyle gg.aa.yyyy yazar', () => {
        // 22:30 UTC = ertesi gün 01:30 İstanbul
        expect(formatPortalDay('2026-10-15T22:30:00')).toBe('16.10.2026');
        expect(formatPortalDay('2026-10-15T22:30:00Z')).toBe('16.10.2026');
        expect(formatPortalTime('2026-10-19T05:48:39.0565737')).toBe('08:48');
        expect(formatPortalWeekday('2026-10-19T05:48:39.0565737')).toBe('Pazartesi');
    });

    it('geçersiz/boş tarihte boş metin döner', () => {
        expect(formatPortalDay(null)).toBe('');
        expect(formatPortalDay('tarih değil')).toBe('');
    });

    it('takvim tarihini ve saati saat dilimi dönüşümü olmadan yazar', () => {
        expect(formatPortalCalendarDate('2022-03-01')).toBe('01.03.2022');
        expect(formatPortalClock('09:00:00')).toBe('09:00');
        expect(formatPortalCalendarDate(null)).toBe('');
    });

    it('tutarı Türkçe ₺ biçiminde yazar', () => {
        expect(formatPortalMoney(1500, 'TRY').replace(/\s/g, '')).toBe('₺1.500,00');
        expect(formatPortalMoney(0.5).replace(/\s/g, '')).toBe('₺0,50');
        expect(formatPortalWeight(4.2)).toBe('4,2 kg');
    });

    it('durum ve yöntem etiketleri Türkçe; bilinmeyen değer ham kod göstermez', () => {
        expect(appointmentStatus('Cancelled').label).toBe('İptal edildi');
        expect(appointmentStatus('NoShow').label).toBe('Gelinmedi');
        expect(appointmentStatus('Xyz').label).toBe('Bilinmiyor');
        expect(paymentMethodLabel('Transfer')).toBe('Havale / EFT');
    });

    it('telefon numarasından tel: bağlantısı üretir', () => {
        expect(telHref('0312 555 00 00')).toBe('tel:03125550000');
        expect(telHref('+90 (312) 555-00-00')).toBe('tel:+903125550000');
        expect(telHref(null)).toBeNull();
        expect(telHref('—')).toBeNull();
    });
});

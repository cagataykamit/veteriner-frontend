import { FormControl } from '@angular/forms';
import {
    appointmentCreateScheduleDateValidator,
    appointmentEarliestDateYmd,
    appointmentLatestDateYmd,
    filterAllowedIstanbulTimeOptions,
    isIstanbulDateTimeTooFarInFuture,
    isIstanbulDateTimeTooFarInPast
} from '@/app/features/appointments/utils/appointment-schedule-validation.utils';

/** Backend `AppointmentScheduleWindow`: şimdi − 7 gün öncesine kadar kayıt açılabilir; bugünün geçmiş saatleri serbest. */
describe('appointment-schedule-validation (backend penceresiyle hizalı)', () => {
    // 2026-10-11 12:00 UTC = 15:00 İstanbul (UTC+3)
    const now = new Date('2026-10-11T12:00:00Z');

    beforeEach(() => {
        jasmine.clock().install();
        jasmine.clock().mockDate(now);
    });

    afterEach(() => jasmine.clock().uninstall());

    it('en geç gün bugünden 2 yıl sonra (İstanbul)', () => {
        expect(appointmentLatestDateYmd()).toBe('2028-10-11');
    });

    it('2 yıl sınırı: tam sınır serbest, bir dakika sonrası reddedilir', () => {
        // şimdi 2026-10-11 12:00Z → sınır 2028-10-11 12:00Z = 15:00 İstanbul
        expect(isIstanbulDateTimeTooFarInFuture('2028-10-11', '15:00', now.getTime())).toBeFalse();
        expect(isIstanbulDateTimeTooFarInFuture('2028-10-11', '15:01', now.getTime())).toBeTrue();
        expect(isIstanbulDateTimeTooFarInFuture('5555-01-01', '10:00', now.getTime())).toBeTrue();
        expect(isIstanbulDateTimeTooFarInFuture('2027-01-01', '10:00', now.getTime())).toBeFalse();
    });

    it('en erken gün bugünden 7 gün önce (İstanbul)', () => {
        expect(appointmentEarliestDateYmd()).toBe('2026-10-04');
    });

    it('bugünün geçmiş saati kısıtlanmaz', () => {
        expect(isIstanbulDateTimeTooFarInPast('2026-10-11', '08:00', now.getTime())).toBeFalse();
    });

    it('dünün ve 6 gün öncesinin saatleri serbest', () => {
        expect(isIstanbulDateTimeTooFarInPast('2026-10-10', '09:00', now.getTime())).toBeFalse();
        expect(isIstanbulDateTimeTooFarInPast('2026-10-05', '00:00', now.getTime())).toBeFalse();
    });

    it('7 gün sınırı: tam sınır serbest, bir dakika öncesi reddedilir', () => {
        expect(isIstanbulDateTimeTooFarInPast('2026-10-04', '15:00', now.getTime())).toBeFalse();
        expect(isIstanbulDateTimeTooFarInPast('2026-10-04', '14:59', now.getTime())).toBeTrue();
        expect(isIstanbulDateTimeTooFarInPast('2026-09-01', '10:00', now.getTime())).toBeTrue();
    });

    it('geçersiz giriş için kısıtlama uygulanmaz', () => {
        expect(isIstanbulDateTimeTooFarInPast('', '', now.getTime())).toBeFalse();
    });

    it('gün doğrulayıcısı: 7 günden eski gün reddedilir, sınır ve sonrası serbest, boş serbest', () => {
        const v = appointmentCreateScheduleDateValidator();
        expect(v(new FormControl('2026-10-03'))).toEqual({ tooFarPast: true });
        expect(v(new FormControl('2026-10-04'))).toBeNull();
        expect(v(new FormControl('2026-10-11'))).toBeNull();
        expect(v(new FormControl('2027-01-01'))).toBeNull();
        expect(v(new FormControl('2028-10-11'))).toBeNull(); // tam 2 yıl
        expect(v(new FormControl('2028-10-12'))).toEqual({ tooFarFuture: true });
        expect(v(new FormControl('5555-01-01'))).toEqual({ tooFarFuture: true });
        expect(v(new FormControl(''))).toBeNull();
    });

    it('saat listesi: bugünün geçmiş saatleri listede kalır', () => {
        const options = [{ label: '08:00', value: '08:00' }, { label: '16:00', value: '16:00' }];
        expect(filterAllowedIstanbulTimeOptions('2026-10-11', options)).toEqual(options);
    });

    it('saat listesi: sınır gününde yalnız pencere dışı slotlar çıkar', () => {
        const options = [{ label: '14:45', value: '14:45' }, { label: '15:00', value: '15:00' }, { label: '16:00', value: '16:00' }];
        expect(filterAllowedIstanbulTimeOptions('2026-10-04', options).map((o) => o.value)).toEqual(['15:00', '16:00']);
    });
});

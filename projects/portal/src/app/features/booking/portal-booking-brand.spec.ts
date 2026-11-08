import { accentStyle, contrastRatio, PORTAL_ACCENT_MIN_CONTRAST, usableAccent } from './portal-booking-brand';

describe('portal-booking-brand (APPT-022)', () => {
    it('WCAG kontrast oranını hesaplar', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    });

    it('açık yüzeylerin hepsinde okunan rengi kullanır', () => {
        expect(usableAccent(' #0A5C55 ')).toBe('#0a5c55');
        expect(usableAccent('#1d3557')).toBe('#1d3557');
    });

    it('düşük kontrastlı, biçimsiz ya da boş renkte varsayılana döner', () => {
        expect(usableAccent('#ffd166')).toBeNull();
        expect(usableAccent('#0fa39a')).toBeNull();
        expect(usableAccent('#0a5c5')).toBeNull();
        expect(usableAccent('red')).toBeNull();
        expect(usableAccent(null)).toBeNull();
        expect(accentStyle('#ffd166')).toBeNull();
    });

    it('düğme zemini, seçim ve odak değişkenlerini yazar; yazı beyaz, üzerine gelince koyulaşır', () => {
        const style = accentStyle('#1d3557')!;

        expect(style['--vetinity-navy']).toBe('#1d3557');
        expect(style['--portal-focus']).toBe('#1d3557');
        expect(style['--p-button-primary-background']).toBe('#1d3557');
        expect(style['--p-button-primary-color']).toBe('#ffffff');
        expect(contrastRatio(style['--p-button-primary-hover-background'], '#ffffff')).toBeGreaterThan(contrastRatio('#1d3557', '#ffffff'));
        expect(contrastRatio(style['--p-button-primary-background'], style['--p-button-primary-color'])).toBeGreaterThanOrEqual(PORTAL_ACCENT_MIN_CONTRAST);
    });
});

import { contrast } from '@site-engine';
import { BOOKING_BUTTON_STYLE, bookingButtonHtml, bookingIframeHtml, EMBED_HEIGHT_MESSAGE_TYPE, externalSiteBookingUrl } from './online-booking-embed.utils';

const URL_ = 'https://portal.test/randevu/abcdefghjkmn';

function parse(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html');
}

describe('online-booking-embed.utils', () => {
    it('bağlantıya dış site kaynağını ekler, var olan parametreyi korur', () => {
        expect(externalSiteBookingUrl(URL_)).toBe(`${URL_}?kaynak=dis-site`);
        expect(externalSiteBookingUrl(`${URL_}?saat=x&kaynak=site`)).toBe(`${URL_}?saat=x&kaynak=dis-site`);
    });

    it('düğme yeni sekmede açılan, erişilebilir adlı, satır içi stilli bir bağlantıdır', () => {
        const a = parse(bookingButtonHtml(URL_)).querySelector('a')!;

        expect(a.getAttribute('href')).toBe(`${URL_}?kaynak=dis-site`);
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noopener');
        expect(a.textContent).toBe('Online randevu al');
        expect(a.getAttribute('aria-label')!.startsWith(a.textContent!)).toBe(true);
        expect(a.getAttribute('style')).toContain('background:#0b6b64');
        expect(a.getAttribute('style')).toContain('min-height:44px');
    });

    it('düğmenin yazısı zeminde WCAG AA kontrastını geçer', () => {
        expect(contrast(BOOKING_BUTTON_STYLE['color'], BOOKING_BUTTON_STYLE['background'])).toBeGreaterThanOrEqual(4.5);
    });

    it('gömme kodu başlıklı çerçeve ve yalnız portal kökenini dinleyen betik taşır', () => {
        const html = bookingIframeHtml(URL_, 'Pati "Vet" <Klinik>');
        const doc = parse(html);
        const frame = doc.querySelector('iframe')!;
        const script = doc.querySelector('script')!.textContent!;

        expect(frame.getAttribute('src')).toBe(`${URL_}?kaynak=dis-site`);
        expect(frame.getAttribute('title')).toBe('Pati "Vet" <Klinik>: online randevu talebi');
        expect(frame.hasAttribute('data-vetinity-randevu')).toBe(true);
        expect(html).not.toContain('<Klinik>');
        expect(script).toContain('e.origin !== "https://portal.test"');
        expect(script).toContain(`"${EMBED_HEIGHT_MESSAGE_TYPE}"`);
        expect(script).toContain('contentWindow === e.source');
    });

    it('klinik adı boşsa çerçeve yine adlandırılır', () => {
        expect(parse(bookingIframeHtml(URL_, ' ')).querySelector('iframe')!.getAttribute('title')).toBe('Klinik: online randevu talebi');
    });
});

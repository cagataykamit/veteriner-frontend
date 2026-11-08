import { supportWhatsAppUrl, VETINITY_SUPPORT_WHATSAPP_NUMBER } from './vetinity-support.constants';

describe('supportWhatsAppUrl', () => {
    const message = (url: string) => new URL(url).searchParams.get('text');

    it('destek numarasına wa.me bağlantısı üretir; mesaj aktif klinik adını içerir', () => {
        const url = supportWhatsAppUrl('Patiler Kliniği');

        expect(VETINITY_SUPPORT_WHATSAPP_NUMBER).toBe('905439580091');
        expect(url.startsWith('https://wa.me/905439580091?text=')).toBe(true);
        expect(message(url)).toBe('Merhaba, Vetinity panelinden yazıyorum. Klinik: Patiler Kliniği');
    });

    it('klinik adı yoksa ya da boşsa mesaj yalnız ilk cümledir', () => {
        for (const name of [null, undefined, '', '   ']) {
            expect(message(supportWhatsAppUrl(name)), String(name)).toBe('Merhaba, Vetinity panelinden yazıyorum.');
        }
    });

    it('Türkçe karakterler, boşluk ve & yüzde kodlamasıyla yazılır; mesaj bozulmaz', () => {
        const url = supportWhatsAppUrl(' Çağrı & Şükrü İğneada Ödül ');

        expect(url).toBe(
            'https://wa.me/905439580091?text=Merhaba%2C%20Vetinity%20panelinden%20yaz%C4%B1yorum.%20Klinik%3A%20%C3%87a%C4%9Fr%C4%B1%20%26%20%C5%9E%C3%BCkr%C3%BC%20%C4%B0%C4%9Fneada%20%C3%96d%C3%BCl'
        );
        expect(message(url)).toBe('Merhaba, Vetinity panelinden yazıyorum. Klinik: Çağrı & Şükrü İğneada Ödül');
    });
});

import { serviceIcon, SITE_ICONS } from './site-icons';

describe('hizmet ikonu (K-01)', () => {
    it('hizmet adından tek kuralla seçilir; Türkçe harf ve büyük harf fark etmez', () => {
        expect(serviceIcon('Muayene ve koruyucu hekimlik')).toBe('stethoscope');
        expect(serviceIcon('Aşı ve parazit uygulamaları')).toBe('syringe');
        expect(serviceIcon('AŞI')).toBe('syringe');
        expect(serviceIcon('Cerrahi')).toBe('heartPulse');
        expect(serviceIcon('Kısırlaştırma')).toBe('heartPulse');
        expect(serviceIcon('Laboratuvar ve görüntüleme')).toBe('scan');
        expect(serviceIcon('Kan tahlili')).toBe('flask');
        expect(serviceIcon('Diş bakımı')).toBe('tooth');
        expect(serviceIcon('Yatılı bakım ve gözlem')).toBe('home');
        expect(serviceIcon('Tıraş ve tırnak bakımı')).toBe('scissors');
        expect(serviceIcon('Mikroçip')).toBe('chip');
        expect(serviceIcon('Göz muayenesi')).toBe('stethoscope');
        expect(serviceIcon('Acil müdahale')).toBe('emergency');
    });

    it('eşleşme yoksa nötr pati ikonu gelir; "diş" ve "göz" sözcük içinde aranmaz', () => {
        expect(serviceIcon('Egzotik hayvanlar')).toBe('paw');
        expect(serviceIcon('Disiplin eğitimi')).toBe('paw');
        expect(serviceIcon('')).toBe('paw');
    });

    it('seçilen her ikon sette çizimiyle tanımlıdır', () => {
        for (const title of ['Muayene', 'Aşı', 'Cerrahi', 'Röntgen', 'Laboratuvar', 'Diş', 'Pansiyon', 'Tıraş', 'Mikroçip', 'Göz', 'Eczane', 'Acil', 'Egzotik']) {
            expect(SITE_ICONS[serviceIcon(title)], title).toMatch(/^M/);
        }
    });
});

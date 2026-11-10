import { surfaceRedirectUrl } from '@/app/core/routing/surface-origin.guard';

const LIVE = { public: 'https://www.vetinity.com', panel: 'https://panel.vetinity.com' };

describe('surfaceRedirectUrl (ADR-033)', () => {
    it('tanıtım sitesinden giriş ve panel yolları panel adresine tam yolla gider', () => {
        expect(surfaceRedirectUrl('panel', 'https://www.vetinity.com', '/auth/login', LIVE)).toBe('https://panel.vetinity.com/auth/login');
        expect(surfaceRedirectUrl('panel', 'https://www.vetinity.com', '/auth/signup?kod=ABC', LIVE)).toBe('https://panel.vetinity.com/auth/signup?kod=ABC');
    });

    it('panel adresinden tanıtım sayfaları www adresine gider', () => {
        expect(surfaceRedirectUrl('public', 'https://panel.vetinity.com', '/gizlilik', LIVE)).toBe('https://www.vetinity.com/gizlilik');
    });

    it('yüzey kendi adresindeyse yönlendirme yok', () => {
        expect(surfaceRedirectUrl('panel', 'https://panel.vetinity.com', '/panel/today', LIVE)).toBeNull();
        expect(surfaceRedirectUrl('public', 'https://www.vetinity.com', '/', LIVE)).toBeNull();
    });

    it('kök boşsa (geliştirme) iki yüzey aynı adreste kalır', () => {
        expect(surfaceRedirectUrl('panel', 'http://localhost:4200', '/auth/login', { public: '', panel: '' })).toBeNull();
    });
});

import { isPortalNativePlatform, portalBackButtonAction, portalDeepLinkPath, portalServiceWorkerEnabled } from './portal-native';

describe('portal mobil paket kuralları', () => {
    describe('portalDeepLinkPath', () => {
        const base = 'https://portal.vetinity.com';

        it('davet bağlantısını sorgu dizesiyle uygulama içi yola çevirir', () => {
            expect(portalDeepLinkPath('https://portal.vetinity.com/invite?token=abc%2B1', base)).toBe('/invite?token=abc%2B1');
        });

        it('kök adresi ve parça (#) bilgisini korur', () => {
            expect(portalDeepLinkPath('https://portal.vetinity.com', base)).toBe('/');
            expect(portalDeepLinkPath('https://portal.vetinity.com/pets/p-1#asilar', base)).toBe('/pets/p-1#asilar');
        });

        it('başka alan adını, alt alan adını, benzer adı ve http şemasını reddeder', () => {
            expect(portalDeepLinkPath('https://example.com/invite?token=abc', base)).toBeNull();
            expect(portalDeepLinkPath('https://evil.portal.vetinity.com/invite', base)).toBeNull();
            expect(portalDeepLinkPath('https://portal.vetinity.com.evil.io/invite', base)).toBeNull();
            expect(portalDeepLinkPath('http://portal.vetinity.com/invite?token=abc', base)).toBeNull();
            expect(portalDeepLinkPath('https://portal.vetinity.com:8443/invite', base)).toBeNull();
        });

        it('özel şemayı ve geçersiz adresi reddeder', () => {
            expect(portalDeepLinkPath('vetinity://invite?token=abc', base)).toBeNull();
            expect(portalDeepLinkPath('javascript:alert(1)', base)).toBeNull();
            expect(portalDeepLinkPath('bozuk adres', base)).toBeNull();
            expect(portalDeepLinkPath('https://portal.vetinity.com/invite', 'bozuk')).toBeNull();
        });

        it('staging portal adresine göre ayrı karar verir', () => {
            const staging = 'https://portal-staging.vetinity.com';

            expect(portalDeepLinkPath('https://portal-staging.vetinity.com/invite?token=t', staging)).toBe('/invite?token=t');
            expect(portalDeepLinkPath('https://portal.vetinity.com/invite?token=t', staging)).toBeNull();
        });
    });

    describe('portalBackButtonAction', () => {
        it('kök sayfalarda (ana sayfa, giriş) uygulamadan çıkar', () => {
            expect(portalBackButtonAction('/', true)).toBe('exit');
            expect(portalBackButtonAction('/login?returnUrl=%2Fpets', true)).toBe('exit');
        });

        it('iç sayfada geçmiş varsa önceki ekrana döner', () => {
            expect(portalBackButtonAction('/pets/p-1', true)).toBe('back');
            expect(portalBackButtonAction('/appointments#gecmis', true)).toBe('back');
        });

        it('geçmiş yoksa (derin bağlantıyla açılan ilk ekran) çıkar', () => {
            expect(portalBackButtonAction('/invite?token=abc', false)).toBe('exit');
        });
    });

    describe('portalServiceWorkerEnabled', () => {
        it('yalnız tarayıcıdaki üretim derlemesinde açıktır', () => {
            expect(portalServiceWorkerEnabled(false, false)).toBeTrue();
            expect(portalServiceWorkerEnabled(false, true)).toBeFalse();
            expect(portalServiceWorkerEnabled(true, false)).toBeFalse();
            expect(portalServiceWorkerEnabled(true, true)).toBeFalse();
        });
    });

    it('tarayıcıda (test ortamı) yerel platform değildir', () => {
        expect(isPortalNativePlatform()).toBeFalse();
    });
});

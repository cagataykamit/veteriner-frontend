import { TestBed } from '@angular/core/testing';
import { PORTAL_DARK_CLASS, PORTAL_THEME_STORAGE_KEY, PortalTheme } from './portal-theme';

describe('PortalTheme (açık/koyu tema)', () => {
    let systemDark: boolean;
    let listeners: ((event: { matches: boolean }) => void)[];

    const create = (): PortalTheme => {
        const theme = TestBed.inject(PortalTheme);

        TestBed.tick();

        return theme;
    };

    const rootIsDark = () => document.documentElement.classList.contains(PORTAL_DARK_CLASS);

    beforeEach(() => {
        systemDark = false;
        listeners = [];
        localStorage.removeItem(PORTAL_THEME_STORAGE_KEY);
        vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) => ({ matches: systemDark, media: query, addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.push(fn) }) as unknown as MediaQueryList
        );
    });

    afterEach(() => {
        localStorage.removeItem(PORTAL_THEME_STORAGE_KEY);
        document.documentElement.classList.remove(PORTAL_DARK_CLASS);
        vi.restoreAllMocks();
    });

    it('tercih yoksa cihaz temasını izler ve değişince güncellenir', () => {
        systemDark = true;
        const theme = create();

        expect(theme.preference()).toBe('system');
        expect(rootIsDark()).toBe(true);

        listeners.forEach((fn) => fn({ matches: false }));
        TestBed.tick();
        expect(rootIsDark()).toBe(false);
    });

    it('sabitlenen tercih cihaz temasından önce gelir ve cihazda saklanır; "Cihaza göre" kaydı siler', () => {
        systemDark = true;
        const theme = create();

        theme.setPreference('light');
        TestBed.tick();
        expect(rootIsDark()).toBe(false);
        expect(localStorage.getItem(PORTAL_THEME_STORAGE_KEY)).toBe('light');

        theme.setPreference('system');
        TestBed.tick();
        expect(rootIsDark()).toBe(true);
        expect(localStorage.getItem(PORTAL_THEME_STORAGE_KEY)).toBeNull();
    });

    it('kayıtlı koyu tercihiyle açılır', () => {
        localStorage.setItem(PORTAL_THEME_STORAGE_KEY, 'dark');
        const theme = create();

        expect(theme.preference()).toBe('dark');
        expect(rootIsDark()).toBe(true);
    });
});

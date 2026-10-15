import { TestBed } from '@angular/core/testing';
import { LayoutService, VETINITY_THEME_STORAGE_KEY } from '@/app/layout/service/layout.service';
import { AppFloatingConfigurator } from './app.floatingconfigurator';

describe('AppFloatingConfigurator tema düğmesi', () => {
    let storedTheme: string | null;

    beforeEach(() => {
        storedTheme = localStorage.getItem(VETINITY_THEME_STORAGE_KEY);
        // Arka arkaya geçişler birbirini iptal edip işlenmemiş reddetme bırakmasın.
        spyOn(document, 'startViewTransition').and.callFake(((update: () => void) => {
            update();

            return {} as ViewTransition;
        }) as typeof document.startViewTransition);
    });

    afterEach(() => {
        TestBed.inject(LayoutService).setDarkTheme(false);
        TestBed.tick();

        if (storedTheme === null) {
            localStorage.removeItem(VETINITY_THEME_STORAGE_KEY);
        } else {
            localStorage.setItem(VETINITY_THEME_STORAGE_KEY, storedTheme);
        }
    });

    it('erişilebilir adı yapılacak geçişi söyler ve tıklayınca güncellenir', () => {
        TestBed.inject(LayoutService).setDarkTheme(false);
        const fixture = TestBed.createComponent(AppFloatingConfigurator);

        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

        expect(button.getAttribute('aria-label')).toBe('Koyu temaya geç');

        button.click();
        fixture.detectChanges();

        expect(TestBed.inject(LayoutService).isDarkTheme()).toBeTrue();
        expect(button.getAttribute('aria-label')).toBe('Açık temaya geç');
    });
});

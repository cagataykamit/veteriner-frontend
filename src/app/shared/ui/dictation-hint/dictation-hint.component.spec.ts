import { TestBed } from '@angular/core/testing';
import { DictationHintComponent, isWindowsDesktop } from '@/app/shared/ui/dictation-hint/dictation-hint.component';

describe('DictationHintComponent', () => {
    const ua = navigator.userAgent;

    afterEach(() => {
        Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
        vi.restoreAllMocks();
    });

    function render(userAgent: string, coarse: boolean): HTMLElement {
        Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: coarse } as MediaQueryList);
        const fixture = TestBed.createComponent(DictationHintComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    it('Windows masaüstünde Win + H ipucu görünür', () => {
        const el = render('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false);

        expect(el.querySelector('[data-testid="dictation-hint"]')?.textContent).toContain('Sesle yazmak için');
    });

    it('Mac, telefon ve dokunmatik Windows cihazda görünmez', () => {
        expect(render('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', false).querySelector('[data-testid="dictation-hint"]')).toBeNull();
        expect(render('Mozilla/5.0 (Linux; Android 14)', true).querySelector('[data-testid="dictation-hint"]')).toBeNull();
        expect(render('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', true).querySelector('[data-testid="dictation-hint"]')).toBeNull();
    });

    it('isWindowsDesktop dokunmatik birincil işaretçide false döner', () => {
        Object.defineProperty(navigator, 'userAgent', { value: 'Windows NT 10.0', configurable: true });
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
        expect(isWindowsDesktop()).toBe(false);
    });
});

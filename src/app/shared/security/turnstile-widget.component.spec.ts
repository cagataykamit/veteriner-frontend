import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnstileWidgetComponent } from './turnstile-widget.component';

describe('TurnstileWidgetComponent', () => {
    let fixture: ComponentFixture<TurnstileWidgetComponent>;
    let options: Record<string, unknown> | null;
    const api = {
        render: vi.fn((_: HTMLElement, o: Record<string, unknown>) => {
            options = o;

            return 'w1';
        }),
        reset: vi.fn(),
        remove: vi.fn()
    };

    beforeEach(async () => {
        options = null;
        vi.clearAllMocks();
        (window as unknown as { turnstile: unknown }).turnstile = api;
        await TestBed.configureTestingModule({ imports: [TurnstileWidgetComponent] }).compileComponents();
        fixture = TestBed.createComponent(TurnstileWidgetComponent);
        fixture.componentRef.setInput('action', 'signup-email-code');
    });

    afterEach(() => delete (window as unknown as { turnstile?: unknown }).turnstile);

    it('site anahtarı yoksa çizmez', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        expect(api.render).not.toHaveBeenCalled();
    });

    it('site anahtarı ve eylemle çizer; jetonu verir, sıfırlamada temizler ve kaldırılınca widget silinir', async () => {
        const tokens: (string | null)[] = [];

        fixture.componentInstance.tokenChange.subscribe((t) => tokens.push(t));
        fixture.componentRef.setInput('siteKey', 'site');
        fixture.detectChanges();
        await fixture.whenStable();

        expect(options?.['sitekey']).toBe('site');
        expect(options?.['action']).toBe('signup-email-code');
        expect(options?.['language']).toBe('tr');

        (options?.['callback'] as (t: string) => void)('jeton');
        (options?.['expired-callback'] as () => void)();
        fixture.componentInstance.reset();
        fixture.destroy();

        expect(tokens).toEqual(['jeton', null, null]);
        expect(api.reset).toHaveBeenCalledWith('w1');
        expect(api.remove).toHaveBeenCalledWith('w1');
    });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppTrialLimitNoticeComponent } from './app-trial-limit-notice.component';

describe('AppTrialLimitNoticeComponent', () => {
    let claims: Set<string>;

    function create(message: string): HTMLElement {
        const fixture = TestBed.createComponent(AppTrialLimitNoticeComponent);

        fixture.componentRef.setInput('message', message);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        claims = new Set();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }]
        });
    });

    it('mesajı ve abonelik erişimi olan rolde "Aboneliğe geç" bağlantısını gösterir', () => {
        claims.add('Subscriptions.Read');
        const el = create('Deneme sürümünde dışa aktarma en fazla 1000 satır sınırı; abonelikle kalkar.');
        const link = el.querySelector<HTMLAnchorElement>('[data-testid="trial-limit-subscription-link"]');

        expect(el.textContent).toContain('1000 satır');
        expect(link?.textContent).toContain('Aboneliğe geç');
        expect(link?.getAttribute('href')).toBe('/panel/settings/subscription');
    });

    it('abonelik erişimi olmayan rolde bağlantı yerine yöneticiye yönlendirir', () => {
        const el = create('Sınır aşıldı.');

        expect(el.querySelector('[data-testid="trial-limit-subscription-link"]')).toBeNull();
        expect(el.textContent).toContain('kurum yöneticinize');
    });
});

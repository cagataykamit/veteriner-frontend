import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { HUMAN_CHECK_PENDING_MESSAGE, PortalHumanVerificationService } from '@portal/app/core/security/portal-human-verification.service';
import { PortalLoginComponent } from './portal-login.component';

describe('PortalLoginComponent insan doğrulaması (Turnstile)', () => {
    let fixture: ComponentFixture<PortalLoginComponent>;
    let api: MockedObject<PortalAuthApi>;
    const turnstile = { render: vi.fn(() => 'w1'), reset: vi.fn(), remove: vi.fn() };

    beforeEach(async () => {
        (window as unknown as { turnstile: unknown }).turnstile = turnstile;
        api = { requestCode: vi.fn().mockReturnValue(of(undefined)) } as unknown as MockedObject<PortalAuthApi>;
        await TestBed.configureTestingModule({
            imports: [PortalLoginComponent],
            providers: [
                provideRouter([]),
                { provide: PortalAuthApi, useValue: api },
                { provide: PortalSessionService, useValue: {} },
                { provide: PortalHumanVerificationService, useValue: { siteKey: () => of('site-anahtari') } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PortalLoginComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.componentInstance.form.controls.email.setValue('ayse@example.com');
    });

    afterEach(() => {
        fixture.destroy();
        delete (window as unknown as { turnstile?: unknown }).turnstile;
    });

    it('doğrulama bitmeden kod istemez; jetonla ister ve widget yenilenir', () => {
        const cmp = fixture.componentInstance;

        expect(turnstile.render).toHaveBeenCalled();

        cmp.requestCode();
        expect(api.requestCode).not.toHaveBeenCalled();
        expect(cmp.error()).toBe(HUMAN_CHECK_PENDING_MESSAGE);

        cmp.turnstileToken.set('insan-jetonu');
        cmp.requestCode();

        expect(api.requestCode).toHaveBeenCalledWith('ayse@example.com', 'insan-jetonu');
        expect(turnstile.reset).toHaveBeenCalledWith('w1');
    });
});

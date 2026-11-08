import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { isAnonymousPortalPath, PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { PortalMarketingOptOutApi, type PortalMarketingOptOutPage } from './portal-marketing-opt-out.api';
import { PortalMarketingOptOutComponent } from './portal-marketing-opt-out.component';

const PAGE: PortalMarketingOptOutPage = { clinicName: 'Merkez Veteriner', isOptedOut: false };

describe('PortalMarketingOptOutComponent (ticari ileti reddi, ADR-046)', () => {
    let fixture: ComponentFixture<PortalMarketingOptOutComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalMarketingOptOutApi>;

    async function create(token: string | undefined, page$: Observable<PortalMarketingOptOutPage> = of(PAGE)): Promise<void> {
        api.preview.mockReturnValue(page$);
        fixture = TestBed.createComponent(PortalMarketingOptOutComponent);
        fixture.componentRef.setInput('token', token);
        el = fixture.nativeElement;
        await settle();
    }

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        api = {
            preview: vi.fn().mockName('PortalMarketingOptOutApi.preview'),
            confirm: vi.fn().mockName('PortalMarketingOptOutApi.confirm').mockReturnValue(of(undefined))
        } as unknown as MockedObject<PortalMarketingOptOutApi>;
        await TestBed.configureTestingModule({
            imports: [PortalMarketingOptOutComponent],
            providers: [provideRouter([]), { provide: PortalMarketingOptOutApi, useValue: api }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('uçlar kimliksizdir', () => {
        expect(isAnonymousPortalPath(PORTAL_ENDPOINTS.marketingOptOutPreview)).toBe(true);
        expect(isAnonymousPortalPath(PORTAL_ENDPOINTS.marketingOptOutConfirm)).toBe(true);
    });

    it('sayfayı açmak yalnız bilgi okur; ret düğmeye basılmadan gitmez', async () => {
        await create('tok');

        expect(api.preview).toHaveBeenCalledWith('tok');
        expect(api.confirm).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Merkez Veteriner');
    });

    it('tek düğmeyle ret gönderilir ve sonuç yazılır', async () => {
        await create('tok');

        buttonByText(el, 'Ticari iletileri reddet')?.click();
        await settle();

        expect(api.confirm).toHaveBeenCalledWith('tok');
        expect(el.querySelector('[data-testid=optout-done]')?.textContent).toContain('artık ticari ileti göndermeyecek');
    });

    it('zaten reddedilmişse düğme yerine durum gösterilir', async () => {
        await create('tok', of({ ...PAGE, isOptedOut: true }));

        expect(el.querySelector('[data-testid=optout-done]')).not.toBeNull();
        expect(buttonByText(el, 'Ticari iletileri reddet')).toBeFalsy();
    });

    it('token yoksa ya da geçersizse tek mesaj', async () => {
        await create(undefined);
        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.marketingOptOutNotFound]);
        fixture.destroy();

        await create('yok', throwError(() => new HttpErrorResponse({ status: 404 })));
        expect(el.textContent).toContain('Bağlantı geçersiz');
    });
});

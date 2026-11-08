import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { isAnonymousPortalPath, PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, problem } from '@portal/app/testing/portal-testing';
import { PortalWaitlistOfferApi, PortalWaitlistOfferPage } from './portal-waitlist-offer.api';
import { PortalWaitlistOfferComponent } from './portal-waitlist-offer.component';

const PAGE: PortalWaitlistOfferPage = {
    clinicName: 'Merkez Veteriner',
    scheduledAtUtc: '2026-11-11T07:00:00Z',
    durationMinutes: 30,
    petName: 'Pamuk',
    expiresAtUtc: '2026-11-09T09:00:00Z'
};

describe('PortalWaitlistOfferComponent (bekleme listesi teklifi)', () => {
    let fixture: ComponentFixture<PortalWaitlistOfferComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalWaitlistOfferApi>;

    async function create(token: string | undefined, page$ = of(PAGE)): Promise<void> {
        api.preview.mockReturnValue(page$);
        fixture = TestBed.createComponent(PortalWaitlistOfferComponent);
        fixture.componentRef.setInput('token', token);
        el = fixture.nativeElement;
        await settle();
    }

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function click(text: string): Promise<void> {
        const button = buttonByText(el, text);

        if (!button) {
            throw new Error(`Düğme yok: ${text}`);
        }

        button.click();
        await settle();
    }

    beforeEach(async () => {
        api = {
            preview: vi.fn().mockName('PortalWaitlistOfferApi.preview'),
            accept: vi.fn().mockName('PortalWaitlistOfferApi.accept').mockReturnValue(of(undefined)),
            decline: vi.fn().mockName('PortalWaitlistOfferApi.decline').mockReturnValue(of(undefined))
        } as unknown as MockedObject<PortalWaitlistOfferApi>;
        await TestBed.configureTestingModule({
            imports: [PortalWaitlistOfferComponent],
            providers: [provideRouter([]), { provide: PortalWaitlistOfferApi, useValue: api }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('uçlar kimliksizdir', () => {
        expect(isAnonymousPortalPath(PORTAL_ENDPOINTS.waitlistOfferPreview)).toBe(true);
        expect(isAnonymousPortalPath(PORTAL_ENDPOINTS.waitlistOfferAccept)).toBe(true);
        expect(isAnonymousPortalPath(PORTAL_ENDPOINTS.waitlistOfferDecline)).toBe(true);
    });

    it('sayfayı açmak yalnız bilgi okur; kabul ve ret düğmeye basılmadan gitmez', async () => {
        await create('tok');

        expect(api.preview).toHaveBeenCalledWith('tok');
        expect(api.accept).not.toHaveBeenCalled();
        expect(api.decline).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Merkez Veteriner');
        expect(el.textContent).toContain('Pamuk');
        expect(el.textContent).toContain('saat 10:00');
        expect(el.querySelector('[data-testid="offer-expires"]')?.textContent).toContain('12:00');
    });

    it('kabul edince randevunun oluştuğunu gösterir', async () => {
        await create('tok');

        await click('Randevuyu al');

        expect(api.accept).toHaveBeenCalledWith('tok');
        expect(el.querySelector('[data-testid="offer-accepted"]')).not.toBeNull();
        expect(el.textContent).toContain('Randevunuz oluştu');
    });

    it('reddedince listedeki yerin korunduğunu söyler', async () => {
        await create('tok');

        await click('Bu saat bana uymuyor');

        expect(api.decline).toHaveBeenCalledWith('tok');
        expect(el.querySelector('[data-testid="offer-declined"]')?.textContent).toContain('yeriniz korunuyor');
    });

    it('saat dolduysa "saat doldu" gösterir', async () => {
        api.accept.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.waitlistOfferSlotTaken)));
        await create('tok');

        await click('Randevuyu al');

        expect(el.querySelector('[data-testid="offer-slot-taken"]')?.textContent).toContain(
            PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.waitlistOfferSlotTaken]
        );
    });

    it('geçersiz, kullanılmış ya da süresi dolmuş teklifte tek mesaj gösterir', async () => {
        await create('tok', throwError(() => problem(404, PORTAL_ERROR_CODES.waitlistOfferNotFound)));

        expect(el.textContent).toContain('Teklif geçerli değil');
        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.waitlistOfferNotFound]);
        expect(buttonByText(el, 'Randevuyu al')).toBeUndefined();
    });

    it('token yoksa istek atmaz', async () => {
        await create(undefined);

        expect(api.preview).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Teklif geçerli değil');
    });

    it('çakışmada hata gösterir ve düğmeler açık kalır', async () => {
        api.accept.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.waitlistOfferConflict)));
        await create('tok');

        await click('Randevuyu al');

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.waitlistOfferConflict]);
        expect(buttonByText(el, 'Randevuyu al')).toBeDefined();
    });
});

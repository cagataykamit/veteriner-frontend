import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { PortalAcceptanceComponent } from './portal-acceptance.component';
import { PortalAcceptanceStatus, PortalLegalApi } from './portal-legal.api';

const DOCS_PENDING: PortalAcceptanceStatus = {
    requiresAcceptance: true,
    pendingDocuments: [
        { documentType: 'PortalTerms', version: '0.2' },
        { documentType: 'PortalPrivacy', version: '0.1' }
    ],
    pendingClinicDisclosures: [{ linkId: 'link-1', clinicId: 'clinic-1', clinicName: 'Merkez' }]
};

const DISCLOSURE_PENDING: PortalAcceptanceStatus = { requiresAcceptance: false, pendingDocuments: [], pendingClinicDisclosures: DOCS_PENDING.pendingClinicDisclosures };
const DONE: PortalAcceptanceStatus = { requiresAcceptance: false, pendingDocuments: [], pendingClinicDisclosures: [] };

describe('PortalAcceptanceComponent (engelleyici kabul adımları)', () => {
    let fixture: ComponentFixture<PortalAcceptanceComponent>;
    let el: HTMLElement;
    let legal: MockedObject<PortalLegalApi>;
    let session: MockedObject<PortalSessionService>;
    let router: Router;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function start(status: PortalAcceptanceStatus): Promise<void> {
        legal.myAcceptances.mockReturnValue(of(status));
        fixture = TestBed.createComponent(PortalAcceptanceComponent);
        el = fixture.nativeElement;
        await settle();
    }

    beforeEach(async () => {
        legal = {
            myAcceptances: vi.fn().mockName('PortalLegalApi.myAcceptances'),
            accept: vi.fn().mockName('PortalLegalApi.accept'),
            clinicDisclosure: vi.fn().mockName('PortalLegalApi.clinicDisclosure'),
            acknowledgeClinicDisclosure: vi.fn().mockName('PortalLegalApi.acknowledgeClinicDisclosure')
        } as unknown as MockedObject<PortalLegalApi>;
        legal.clinicDisclosure.mockReturnValue(of({ linkId: 'link-1', clinicId: 'clinic-1', clinicName: 'Merkez', text: 'MERKEZ — AYDINLATMA METNİ\nVeri sorumlusu Merkez.', isDefault: true, acknowledgedAtUtc: null }));
        session = {
            markAcceptanceCleared: vi.fn().mockName('PortalSessionService.markAcceptanceCleared'),
            logout: vi.fn().mockName('PortalSessionService.logout')
        } as unknown as MockedObject<PortalSessionService>;
        session.logout.mockReturnValue(of(undefined));
        await TestBed.configureTestingModule({
            imports: [PortalAcceptanceComponent],
            providers: [provideRouter([]), { provide: PortalLegalApi, useValue: legal }, { provide: PortalSessionService, useValue: session }]
        }).compileComponents();
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    });

    afterEach(() => fixture?.destroy());

    it('önce bekleyen belgeleri backend sürümleriyle gösterir; atlama/kapatma düğmesi yoktur', async () => {
        await start(DOCS_PENDING);

        expect(el.textContent).toContain('Kullanım Şartları (sürüm 0.2)');
        expect(el.textContent).toContain('Gizlilik Politikası (sürüm 0.1)');
        const labels = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

        expect(labels.some((l) => /atla|kapat|sonra/i.test(l ?? ''))).toBe(false);
    });

    it('onay kutusu işaretlenmeden kabul gönderilmez', async () => {
        await start(DOCS_PENDING);
        buttonByText(el, 'Onayla ve devam et')!.click();
        await settle();

        expect(legal.accept).not.toHaveBeenCalled();
        expect(el.textContent).toContain('belgeleri okuyup onaylamanız gerekiyor');
    });

    it('belgeler kabul edilince klinik aydınlatma metni adımına geçer; onaylanınca portal açılır', async () => {
        legal.accept.mockReturnValue(of(DISCLOSURE_PENDING));
        legal.acknowledgeClinicDisclosure.mockReturnValue(of(undefined));
        await start(DOCS_PENDING);

        el.querySelector<HTMLInputElement>('portal-legal-consent input[type=checkbox]')!.click();
        buttonByText(el, 'Onayla ve devam et')!.click();
        await settle();

        expect(legal.accept).toHaveBeenCalledWith(DOCS_PENDING.pendingDocuments);
        expect(legal.clinicDisclosure).toHaveBeenCalledWith('link-1');
        expect(el.querySelector('[data-testid=disclosure-text]')?.textContent).toContain('AYDINLATMA METNİ');
        expect(session.markAcceptanceCleared).not.toHaveBeenCalled();

        legal.myAcceptances.mockReturnValue(of(DONE));
        buttonByText(el, 'Okudum, bilgilendirildim')!.click();
        await settle();

        expect(legal.acknowledgeClinicDisclosure).toHaveBeenCalledWith('link-1');
        expect(session.markAcceptanceCleared).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('kabul edilecek bir şey kalmadıysa doğrudan portala geçer', async () => {
        await start(DONE);

        expect(session.markAcceptanceCleared).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
    });

    it('kabul etmek istemeyen kullanıcı yalnız çıkış yapabilir', async () => {
        await start(DOCS_PENDING);
        buttonByText(el, 'Çıkış yap')!.click();
        await settle();

        expect(session.logout).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });
});

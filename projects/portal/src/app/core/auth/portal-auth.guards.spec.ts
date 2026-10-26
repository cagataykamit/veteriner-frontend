import type { Mock, MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalLegalApi, PortalAcceptanceStatus } from '@portal/app/features/legal/portal-legal.api';
import { portalAcceptanceGuard } from '@portal/app/features/legal/portal-acceptance.guard';
import { portalAuthGuard, portalClinicGuard, portalGuestGuard, safeReturnUrl } from './portal-auth.guards';
import type { PortalSessionStatus } from './portal-auth.models';
import { PortalSessionService } from './portal-session.service';

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/account' } as RouterStateSnapshot;

describe("portal guard'ları", () => {
    let session: MockedObject<PortalSessionService> & {
        acceptanceCleared: Mock;
        needsClinicSelection: Mock;
    };
    let legal: MockedObject<PortalLegalApi>;
    let router: Router;

    const run = <T>(guard: () => T): T => TestBed.runInInjectionContext(guard);
    const urlOf = (result: unknown) => router.serializeUrl(result as UrlTree);

    beforeEach(() => {
        session = Object.assign(
            {
                ensureSession: vi.fn().mockName('PortalSessionService.ensureSession'),
                markAcceptanceCleared: vi.fn().mockName('PortalSessionService.markAcceptanceCleared')
            } as unknown as MockedObject<PortalSessionService>,
            {
                acceptanceCleared: vi.fn().mockName('acceptanceCleared').mockReturnValue(false),
                needsClinicSelection: vi.fn().mockName('needsClinicSelection').mockReturnValue(false)
            }
        );
        legal = {
            myAcceptances: vi.fn().mockName('PortalLegalApi.myAcceptances')
        } as unknown as MockedObject<PortalLegalApi>;
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: PortalSessionService, useValue: session }, { provide: PortalLegalApi, useValue: legal }]
        });
        router = TestBed.inject(Router);
    });

    function withStatus(status: PortalSessionStatus): void {
        session.ensureSession.mockResolvedValue(status);
    }

    it('oturum yoksa dönüş adresiyle girişe yönlendirir', async () => {
        withStatus('anonymous');

        expect(urlOf(await run(() => portalAuthGuard(route, state)))).toBe('/login?returnUrl=%2Faccount');
    });

    it('oturum varsa geçirir; sunucuya ulaşılamıyorsa çevrimdışı sayfasına gönderir', async () => {
        withStatus('authenticated');
        expect(await run(() => portalAuthGuard(route, state))).toBe(true);

        withStatus('offline');
        expect(urlOf(await run(() => portalAuthGuard(route, state)))).toBe('/offline');
    });

    it('giriş sayfası oturum açıkken ana sayfaya yönlendirir', async () => {
        withStatus('authenticated');
        expect(urlOf(await run(() => portalGuestGuard(route, state)))).toBe('/');

        withStatus('anonymous');
        expect(await run(() => portalGuestGuard(route, state))).toBe(true);
    });

    describe("kabul guard'ı (engelleyici)", () => {
        const pending: PortalAcceptanceStatus = {
            requiresAcceptance: true,
            pendingDocuments: [{ documentType: 'PortalTerms', version: '0.1' }],
            pendingClinicDisclosures: []
        };
        const disclosurePending: PortalAcceptanceStatus = {
            requiresAcceptance: false,
            pendingDocuments: [],
            pendingClinicDisclosures: [{ linkId: 'link-1', clinicId: 'c', clinicName: 'Merkez' }]
        };
        const done: PortalAcceptanceStatus = { requiresAcceptance: false, pendingDocuments: [], pendingClinicDisclosures: [] };

        beforeEach(() => withStatus('authenticated'));

        it("oturum yoksa sunucuya sormaz; yönlendirmeyi kimlik guard'ına bırakır", async () => {
            withStatus('anonymous');

            expect(await run(() => portalAcceptanceGuard(route, state))).toBe(false);
            expect(legal.myAcceptances).not.toHaveBeenCalled();
        });

        it('bekleyen belge varsa portalı açmaz', async () => {
            legal.myAcceptances.mockReturnValue(of(pending));

            expect(urlOf(await run(() => portalAcceptanceGuard(route, state)))).toBe('/accept');
        });

        it('onaylanmamış klinik aydınlatma metni varsa portalı açmaz', async () => {
            legal.myAcceptances.mockReturnValue(of(disclosurePending));

            expect(urlOf(await run(() => portalAcceptanceGuard(route, state)))).toBe('/accept');
        });

        it('durum okunamazsa da geçirmez', async () => {
            legal.myAcceptances.mockReturnValue(throwError(() => new Error('ağ')));

            expect(urlOf(await run(() => portalAcceptanceGuard(route, state)))).toBe('/accept');
        });

        it('hepsi onaylıysa geçirir ve sonucu oturumda saklar', async () => {
            legal.myAcceptances.mockReturnValue(of(done));

            expect(await run(() => portalAcceptanceGuard(route, state))).toBe(true);
            expect(session.markAcceptanceCleared).toHaveBeenCalled();
        });

        it('oturumda onay temizse sunucuya sormaz', async () => {
            session.acceptanceCleared.mockReturnValue(true);

            expect(await run(() => portalAcceptanceGuard(route, state))).toBe(true);
            expect(legal.myAcceptances).not.toHaveBeenCalled();
        });
    });

    it('çok klinikte seçim yoksa klinik seçimine yönlendirir', async () => {
        withStatus('authenticated');
        session.needsClinicSelection.mockReturnValue(true);
        expect(urlOf(await run(() => portalClinicGuard(route, state)))).toBe('/clinics');

        session.needsClinicSelection.mockReturnValue(false);
        expect(await run(() => portalClinicGuard(route, state))).toBe(true);
    });

    it('dönüş adresi yalnız uygulama içi yol olabilir', () => {
        expect(safeReturnUrl('/account')).toBe('/account');
        expect(safeReturnUrl('//evil.example')).toBeNull();
        expect(safeReturnUrl('https://evil.example')).toBeNull();
        expect(safeReturnUrl(undefined)).toBeNull();
    });
});

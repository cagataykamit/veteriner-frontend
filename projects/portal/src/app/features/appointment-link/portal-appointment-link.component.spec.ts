import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { isAnonymousPortalPath, PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText, configurePortalHttp, problem, TEST_PORTAL_BASE } from '@portal/app/testing/portal-testing';
import { PortalAppointmentLinkApi, PortalAppointmentLinkPage } from './portal-appointment-link.api';
import { PortalAppointmentLinkComponent } from './portal-appointment-link.component';

const PAGE: PortalAppointmentLinkPage = {
    clinicName: 'Merkez Veteriner',
    scheduledAtUtc: '2026-11-09T07:30:00Z',
    petName: 'Pamuk',
    cancelEnabled: true
};

describe('PortalAppointmentLinkComponent (hatırlatmada onayla / iptal et)', () => {
    let fixture: ComponentFixture<PortalAppointmentLinkComponent>;
    let el: HTMLElement;
    let api: MockedObject<PortalAppointmentLinkApi>;

    async function create(token: string | undefined, islem?: string, page$ = of(PAGE)): Promise<void> {
        api.preview.mockReturnValue(page$);
        fixture = TestBed.createComponent(PortalAppointmentLinkComponent);
        fixture.componentRef.setInput('token', token);
        fixture.componentRef.setInput('islem', islem);
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
            preview: vi.fn().mockName('PortalAppointmentLinkApi.preview'),
            confirm: vi.fn().mockName('PortalAppointmentLinkApi.confirm').mockReturnValue(of(undefined)),
            cancel: vi.fn().mockName('PortalAppointmentLinkApi.cancel').mockReturnValue(of(undefined))
        } as unknown as MockedObject<PortalAppointmentLinkApi>;
        await TestBed.configureTestingModule({
            imports: [PortalAppointmentLinkComponent],
            providers: [provideRouter([]), { provide: PortalAppointmentLinkApi, useValue: api }]
        }).compileComponents();
    });

    afterEach(() => fixture?.destroy());

    it('sayfayı açmak yalnız bilgi okur; onay ve iptal düğmeye basılmadan gitmez', async () => {
        await create('tok', 'onayla');

        expect(api.preview).toHaveBeenCalledWith('tok');
        expect(api.confirm).not.toHaveBeenCalled();
        expect(api.cancel).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Merkez Veteriner');
        expect(el.textContent).toContain('Pamuk');
        expect(el.textContent).toContain('saat 10:30');
    });

    it('onaylayınca teşekkür gösterir ve randevu durumu için ikinci istek atmaz', async () => {
        await create('tok', 'onayla');

        await click('Geleceğim, onayla');

        expect(api.confirm).toHaveBeenCalledWith('tok');
        expect(api.cancel).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="link-confirmed"]')).not.toBeNull();
    });

    it('iptal bağlantısından gelince iptali öne çıkarır ve iptal eder', async () => {
        await create('tok', 'iptal');

        expect(el.textContent).toContain('Randevunuzu iptal edin');
        await click('Randevuyu iptal et');

        expect(api.cancel).toHaveBeenCalledWith('tok');
        expect(el.querySelector('[data-testid="link-cancelled"]')).not.toBeNull();
    });

    it('onay görünümündeki "iptal et" tek tıkla iptal etmez, önce iptal görünümüne geçer', async () => {
        await create('tok', 'onayla');

        await click('Gelemeyeceğim, iptal et');

        expect(api.cancel).not.toHaveBeenCalled();
        expect(buttonByText(el, 'Randevuyu iptal et')).toBeDefined();
    });

    it('klinik iptali kapattıysa iptal düğmesi yerine "kliniği arayın" gösterir', async () => {
        await create('tok', 'iptal', of({ ...PAGE, cancelEnabled: false }));

        expect(buttonByText(el, 'Randevuyu iptal et')).toBeUndefined();
        expect(buttonByText(el, 'Gelemeyeceğim, iptal et')).toBeUndefined();
        expect(el.querySelector('[data-testid="link-call-clinic"]')).not.toBeNull();
        expect(buttonByText(el, 'Geleceğim, onayla')).toBeDefined();
    });

    it('token yoksa istek atmadan, 404 bağlantıda sebep ayırt etmeden aynı mesajı gösterir', async () => {
        await create(undefined);
        expect(api.preview).not.toHaveBeenCalled();
        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.appointmentLinkNotFound]);
        fixture.destroy();

        await create('eski', 'onayla', throwError(() => problem(404, PORTAL_ERROR_CODES.appointmentLinkNotFound)));
        expect(el.textContent).toContain('Bağlantı geçersiz');
        expect(buttonByText(el, 'Geleceğim, onayla')).toBeUndefined();
    });

    it('eylem sırasında bağlantı kullanılmışsa geçersiz görünümüne geçer', async () => {
        await create('tok', 'onayla');
        api.confirm.mockReturnValue(throwError(() => problem(404, PORTAL_ERROR_CODES.appointmentLinkNotFound)));

        await click('Geleceğim, onayla');

        expect(el.textContent).toContain('Bağlantı geçersiz');
    });

    it('klinik bu arada iptali kapattıysa mesaj gösterir ve iptal düğmesini kaldırır', async () => {
        await create('tok', 'iptal');
        api.cancel.mockReturnValue(throwError(() => problem(409, PORTAL_ERROR_CODES.appointmentLinkCancelDisabled)));

        await click('Randevuyu iptal et');

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.appointmentLinkCancelDisabled]);
        expect(buttonByText(el, 'Randevuyu iptal et')).toBeUndefined();
        expect(buttonByText(el, 'Geleceğim, onayla')).toBeDefined();
    });
});

describe('PortalAppointmentLinkApi', () => {
    beforeEach(() => configurePortalHttp());

    it('token yolda değil gövdede gider; uçlar kimliksizdir', async () => {
        const api = TestBed.inject(PortalAppointmentLinkApi);
        const http = TestBed.inject(HttpTestingController);

        const preview = firstValueFrom(api.preview('gizli-token'));
        const req = http.expectOne(`${TEST_PORTAL_BASE}/appointment-link/preview`);

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ token: 'gizli-token' });
        expect([PORTAL_ENDPOINTS.appointmentLinkPreview, PORTAL_ENDPOINTS.appointmentLinkConfirm, PORTAL_ENDPOINTS.appointmentLinkCancel].every(isAnonymousPortalPath)).toBe(true);
        req.flush(PAGE);
        await expect(preview).resolves.toEqual(PAGE);

        void firstValueFrom(api.cancel('gizli-token'));
        const cancel = http.expectOne(`${TEST_PORTAL_BASE}/appointment-link/cancel`);

        expect(cancel.request.url).not.toContain('gizli-token');
        cancel.flush(null);
        http.verify();
    });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { configurePortalHttp, expectOneSoon, problem, TEST_PORTAL_BASE as BASE, tick } from '@portal/app/testing/portal-testing';
import { PortalPushDevice, type PortalPushPlatform } from './portal-push-device';
import { PortalPushRegistration } from './portal-push-registration';

describe('PortalPushRegistration', () => {
    let http: HttpTestingController;
    let device: { supported: boolean; platform: PortalPushPlatform; obtainToken: () => Promise<string>; silentToken: () => Promise<string | null> };

    function setup(): PortalPushRegistration {
        configurePortalHttp();
        TestBed.overrideProvider(PortalPushDevice, { useValue: device });
        http = TestBed.inject(HttpTestingController);

        return TestBed.inject(PortalPushRegistration);
    }

    beforeEach(() => {
        device = {
            supported: true,
            platform: 'Android',
            obtainToken: vi.fn(() => Promise.resolve('fcm-1')),
            silentToken: vi.fn(() => Promise.resolve('fcm-1'))
        };
    });

    afterEach(() => http.verify());

    it('izinle kayıt jetonu platformla PUT eder', async () => {
        const registration = setup();
        const done = firstValueFrom(registration.registerWithPermission());

        const req = await expectOneSoon(http, `${BASE}/me/push-devices`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ platform: 'Android', token: 'fcm-1' });
        req.flush(null, { status: 204, statusText: 'No Content' });

        await done;
        expect(device.obtainToken).toHaveBeenCalledTimes(1);
    });

    it('açılış eşitlemesi izin yoksa istek atmaz', async () => {
        device.silentToken = vi.fn(() => Promise.resolve(null));
        const registration = setup();

        await firstValueFrom(registration.syncThisDevice());
        await tick();

        http.expectNone(`${BASE}/me/push-devices`);
    });

    it('açılış eşitlemesi tercih kapalıyken (409) sessiz biter', async () => {
        const registration = setup();
        const done = firstValueFrom(registration.syncThisDevice());

        (await expectOneSoon(http, `${BASE}/me/push-devices`)).flush(problem(409, 'Portal.Push.Disabled').error, {
            status: 409,
            statusText: 'Conflict'
        });

        await expect(done).resolves.toBeUndefined();
    });

    it('çıkışta kayıtlı jetonu kaldırır; hata çıkışı engellemez', async () => {
        const registration = setup();
        const registered = firstValueFrom(registration.syncThisDevice());
        (await expectOneSoon(http, `${BASE}/me/push-devices`)).flush(null, { status: 204, statusText: 'No Content' });
        await registered;

        const revoked = firstValueFrom(registration.revokeThisDevice());
        const req = await expectOneSoon(http, `${BASE}/me/push-devices/revoke`);
        expect(req.request.body).toEqual({ token: 'fcm-1' });
        req.flush('hata', { status: 500, statusText: 'Server Error' });

        await expect(revoked).resolves.toBeUndefined();
    });

    it('desteklenmeyen cihazda çıkışta istek atmaz', async () => {
        device.supported = false;
        const registration = setup();

        await firstValueFrom(registration.revokeThisDevice());

        http.expectNone(`${BASE}/me/push-devices/revoke`);
    });
});

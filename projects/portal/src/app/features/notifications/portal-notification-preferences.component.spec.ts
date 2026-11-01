import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { configurePortalPage, createSessionStub, LINK_MERKEZ, LINK_SAHIL, url, type PortalSessionStub } from '@portal/app/testing/portal-fixtures';
import type { PortalLinkNotificationPreferences } from './portal-notification-preferences.api';
import { PortalNotificationPreferencesComponent } from './portal-notification-preferences.component';

describe('PortalNotificationPreferencesComponent (bildirim tercihleri)', () => {
    let fixture: ComponentFixture<PortalNotificationPreferencesComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let session: PortalSessionStub;

    const accountUrl = url('me/notification-preferences');
    const linkUrl = (linkId = LINK_MERKEZ.linkId) => url(`links/${linkId}/notification-preferences`);
    const switchOf = (id: string) => el.querySelector<HTMLInputElement>(`[data-testid=${id}-switch]`)!;
    const prefs = (overrides: Partial<PortalLinkNotificationPreferences> = {}): PortalLinkNotificationPreferences => ({
        remindersOptedOut: false,
        canEnableReminders: true,
        marketingConsented: false,
        marketingConsentedAtUtc: null,
        marketingSendingEnabled: false,
        ...overrides
    });

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function create(links = [LINK_MERKEZ, LINK_SAHIL]): Promise<void> {
        session = createSessionStub(links);
        configurePortalPage(PortalNotificationPreferencesComponent, session);
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalNotificationPreferencesComponent);
        el = fixture.nativeElement;
        await settle();
    }

    async function load(link: PortalLinkNotificationPreferences = prefs(), push = { enabled: false, available: false }): Promise<void> {
        http.expectOne(accountUrl).flush({ push });
        http.expectOne(linkUrl()).flush(link);
        await settle();
    }

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    describe('push', () => {
        beforeEach(() => create());

        it('sağlayıcı yokken "yakında" açıklaması görünür ve tercih yine kaydedilir: PUT pushEnabled', async () => {
            await load();

            expect(switchOf('push').disabled).toBe(false);
            expect(el.querySelector('[data-testid=push-hint]')?.textContent).toContain('Mobil uygulama bildirimleri yakında');

            switchOf('push').click();
            const put = http.expectOne(accountUrl);

            expect(put.request.method).toBe('PUT');
            expect(put.request.body).toEqual({ pushEnabled: true });
            put.flush({ push: { enabled: true, available: false } });
            await settle();

            expect(switchOf('push').checked).toBe(true);
            expect(el.textContent).toContain('Mobil uygulama bildirimleri açıldı.');
        });

        it('push kaydı başarısızsa anahtar eski değere döner', async () => {
            await load();

            switchOf('push').click();
            http.expectOne(accountUrl).flush({ status: 500 }, { status: 500, statusText: 'Server Error' });
            await settle();

            expect(switchOf('push').checked).toBe(false);
            expect(el.querySelector('[role=alert]')).not.toBeNull();
        });
    });

    describe('hatırlatma', () => {
        beforeEach(() => create());

        it('açık hatırlatma kapatılır: kısmi PUT remindersOptedOut=true, yanıt anahtara ve ipucuna yansır', async () => {
            await load();

            expect(switchOf('reminders').checked).toBe(true);
            expect(switchOf('reminders').getAttribute('role')).toBe('switch');
            expect(el.textContent).toContain('Merkez yaklaşan aşı ve randevularınızı size hatırlatır.');

            switchOf('reminders').click();
            const put = http.expectOne(linkUrl());

            expect(put.request.method).toBe('PUT');
            expect(put.request.body).toEqual({ remindersOptedOut: true });
            await settle();
            expect(switchOf('reminders').disabled).toBe(true);
            expect(switchOf('marketing').disabled).toBe(true);

            put.flush(prefs({ remindersOptedOut: true }));
            await settle();

            expect(switchOf('reminders').checked).toBe(false);
            expect(switchOf('reminders').disabled).toBe(false);
            expect(el.textContent).toContain('Merkez size otomatik hatırlatma göndermiyor.');
            expect(el.textContent).toContain('Hatırlatmalar kapatıldı.');
        });

        it('KVKK Ret kaydında anahtar kilitli ve açıklama görünür', async () => {
            await load(prefs({ remindersOptedOut: true, canEnableReminders: false }));

            expect(switchOf('reminders').checked).toBe(false);
            expect(switchOf('reminders').disabled).toBe(true);
            expect(el.querySelector('[data-testid=reminders-kvkk-note]')?.textContent).toContain('KVKK');
        });

        it('kaydetme hatasında anahtar sunucudaki değere döner ve sözleşme koduna göre mesaj gösterilir', async () => {
            await load(prefs({ remindersOptedOut: true }));

            switchOf('reminders').click();
            http.expectOne(linkUrl()).flush({ status: 409, extensions: { code: 'Clients.RemindersKvkkDeclined' } }, { status: 409, statusText: 'Conflict' });
            await settle();

            expect(switchOf('reminders').checked).toBe(false);
            expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_ERROR_MESSAGES['Clients.RemindersKvkkDeclined']);
        });

        it('klinik değişince seçili bağın tercihi okunur', async () => {
            await load();

            session.activeLink.set(LINK_SAHIL);
            await settle();

            http.expectOne(linkUrl(LINK_SAHIL.linkId)).flush(prefs({ remindersOptedOut: true }));
            await settle();

            expect(switchOf('reminders').checked).toBe(false);
            expect(el.textContent).toContain('Sahil kliniğinden gelenler');
        });
    });

    describe('ticari ileti', () => {
        beforeEach(() => create());

        it('onay verilir: PUT marketingConsented=true; gönderim kapalıyken bilgi notu görünür', async () => {
            await load();

            expect(el.querySelector('[data-testid=marketing-off-note]')?.textContent).toContain('Kampanya/duyuru gönderimi şu an kapalıdır; onayınız kaydedilir.');

            switchOf('marketing').click();
            const put = http.expectOne(linkUrl());

            expect(put.request.body).toEqual({ marketingConsented: true });
            put.flush(prefs({ marketingConsented: true, marketingConsentedAtUtc: '2026-10-16T08:00:00Z' }));
            await settle();

            expect(switchOf('marketing').checked).toBe(true);
            expect(el.textContent).toContain('Onay tarihi: 16 Ekim 2026');
            expect(el.textContent).toContain('Kampanya ve duyuru onayınız kaydedildi.');
        });

        it('gönderim açıksa bilgi notu gösterilmez', async () => {
            await load(prefs({ marketingSendingEnabled: true }));

            expect(el.querySelector('[data-testid=marketing-off-note]')).toBeNull();
        });
    });

    it('klinik portalı kapattıysa bağ tercihleri istenmez, yalnız hesap tercihi görünür', async () => {
        await create([{ ...LINK_MERKEZ, isClinicPortalEnabled: false }]);

        http.expectOne(accountUrl).flush({ push: { enabled: false, available: false } });
        http.expectNone(linkUrl());
        await settle();

        expect(switchOf('push')).not.toBeNull();
        expect(el.querySelector('[data-testid=reminders-switch]')).toBeNull();
    });
});

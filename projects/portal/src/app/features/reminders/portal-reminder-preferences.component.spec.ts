import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { configurePortalPage, createSessionStub, LINK_MERKEZ, LINK_SAHIL, url, type PortalSessionStub } from '@portal/app/testing/portal-fixtures';
import { PortalReminderPreferencesComponent } from './portal-reminder-preferences.component';

describe('PortalReminderPreferencesComponent (hatırlatma tercihi)', () => {
    let fixture: ComponentFixture<PortalReminderPreferencesComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let session: PortalSessionStub;

    const prefsUrl = (linkId = LINK_MERKEZ.linkId) => url(`links/${linkId}/reminder-preferences`);
    const toggle = () => el.querySelector<HTMLInputElement>('[data-testid=reminders-switch]')!;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(async () => {
        session = createSessionStub([LINK_MERKEZ, LINK_SAHIL]);
        configurePortalPage(PortalReminderPreferencesComponent, session);
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalReminderPreferencesComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('açık hatırlatma anahtarla kapatılır: PUT remindersOptedOut=true, yanıt anahtara ve ipucuna yansır', async () => {
        http.expectOne(prefsUrl()).flush({ remindersOptedOut: false, canEnableReminders: true });
        await settle();

        expect(toggle().checked).toBe(true);
        expect(toggle().getAttribute('role')).toBe('switch');
        expect(el.textContent).toContain('Merkez yaklaşan aşı ve randevularınızı size hatırlatır.');

        toggle().click();
        const put = http.expectOne(prefsUrl());

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ remindersOptedOut: true });
        await settle();
        expect(toggle().disabled).toBe(true);

        put.flush({ remindersOptedOut: true, canEnableReminders: true });
        await settle();

        expect(toggle().checked).toBe(false);
        expect(toggle().disabled).toBe(false);
        expect(el.textContent).toContain('Merkez size otomatik hatırlatma göndermiyor.');
        expect(el.textContent).toContain('Hatırlatmalar kapatıldı.');
    });

    it('kapalı hatırlatma açılır: PUT remindersOptedOut=false', async () => {
        http.expectOne(prefsUrl()).flush({ remindersOptedOut: true, canEnableReminders: true });
        await settle();

        toggle().click();
        const put = http.expectOne(prefsUrl());

        expect(put.request.body).toEqual({ remindersOptedOut: false });
        put.flush({ remindersOptedOut: false, canEnableReminders: true });
        await settle();

        expect(toggle().checked).toBe(true);
        expect(el.textContent).toContain('Hatırlatmalar açıldı.');
    });

    it('KVKK Ret kaydında anahtar kilitli ve açıklama görünür', async () => {
        http.expectOne(prefsUrl()).flush({ remindersOptedOut: true, canEnableReminders: false });
        await settle();

        expect(toggle().checked).toBe(false);
        expect(toggle().disabled).toBe(true);
        expect(el.querySelector('[data-testid=reminders-kvkk-note]')?.textContent).toContain('KVKK');
    });

    it('kaydetme hatasında anahtar sunucudaki değere döner ve sözleşme koduna göre mesaj gösterilir', async () => {
        http.expectOne(prefsUrl()).flush({ remindersOptedOut: true, canEnableReminders: true });
        await settle();

        toggle().click();
        http.expectOne(prefsUrl()).flush(
            { status: 409, extensions: { code: 'Clients.RemindersKvkkDeclined' } },
            { status: 409, statusText: 'Conflict' }
        );
        await settle();

        expect(toggle().checked).toBe(false);
        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_ERROR_MESSAGES['Clients.RemindersKvkkDeclined']);
    });

    it('klinik değişince seçili bağın tercihi okunur', async () => {
        http.expectOne(prefsUrl()).flush({ remindersOptedOut: false, canEnableReminders: true });
        await settle();

        session.activeLink.set(LINK_SAHIL);
        await settle();

        http.expectOne(prefsUrl(LINK_SAHIL.linkId)).flush({ remindersOptedOut: true, canEnableReminders: true });
        await settle();

        expect(toggle().checked).toBe(false);
        expect(el.textContent).toContain('Sahil size otomatik hatırlatma göndermiyor.');
    });
});

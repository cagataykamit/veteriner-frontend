import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_SERVER_ERROR_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { CLINIC, configurePortalPage, createSessionStub, LINK_MERKEZ, url } from '@portal/app/testing/portal-fixtures';
import { PortalClinicComponent } from './portal-clinic.component';

describe('PortalClinicComponent (klinik bilgisi)', () => {
    let fixture: ComponentFixture<PortalClinicComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;

    const clinicUrl = url(`links/${LINK_MERKEZ.linkId}/clinic`);

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(async () => {
        configurePortalPage(PortalClinicComponent, createSessionStub());
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalClinicComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('ad, tel: bağlantısı, e-posta, adres ve Pazartesi\'den başlayan çalışma saatleri', async () => {
        expect(el.querySelector('portal-skeleton')).not.toBeNull();
        http.expectOne(clinicUrl).flush(CLINIC);
        await settle();

        expect(el.querySelector('h1')?.textContent).toContain('Merkez');
        expect(el.querySelector('[data-testid=clinic-phone]')?.getAttribute('href')).toBe('tel:03125550000');
        expect(el.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe('mailto:merkez@example.com');
        expect(el.textContent).toContain('Atatürk Bulvarı No: 1');

        const rows = Array.from(el.querySelectorAll('[data-testid=clinic-hours] tr')).map((r) => r.textContent!.replace(/\s+/g, ' ').trim());

        expect(rows[0]).toContain('Pazartesi');
        expect(rows[0]).toContain('09:00–18:00');
        expect(rows[0]).toContain('Ara 12:30–13:30');
        expect(rows[1]).toContain('Pazar');
        expect(rows[1]).toContain('Kapalı');
    });

    it('boş alanlar ve tanımsız çalışma saatlerinde sade metin', async () => {
        http.expectOne(clinicUrl).flush({ ...CLINIC, phone: null, email: null, address: null, city: null, workingHours: [] });
        await settle();

        expect(el.textContent).toContain('Klinik iletişim bilgilerini henüz eklememiş.');
        expect(el.textContent).toContain('Çalışma saatleri henüz eklenmemiş.');
        expect(el.querySelector('a[href^="tel:"]')).toBeNull();
    });

    it('hata durumunda mesaj ve "Tekrar dene"', async () => {
        http.expectOne(clinicUrl).flush(null, { status: 500, statusText: 'Error' });
        await settle();

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_SERVER_ERROR_MESSAGE);
        buttonByText(el, 'Tekrar dene')!.click();
        await settle();
        http.expectOne(clinicUrl).flush(CLINIC);
        await settle();

        expect(el.querySelector('h1')?.textContent).toContain('Merkez');
    });
});

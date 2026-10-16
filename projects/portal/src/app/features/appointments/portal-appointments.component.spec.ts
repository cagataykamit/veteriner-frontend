import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { PORTAL_SERVER_ERROR_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { appointment, configurePortalPage, createSessionStub, LINK_MERKEZ, page, url } from '@portal/app/testing/portal-fixtures';
import { PortalAppointmentsComponent } from './portal-appointments.component';

describe('PortalAppointmentsComponent (randevularım)', () => {
    let fixture: ComponentFixture<PortalAppointmentsComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let router: Router;

    const listUrl = url(`links/${LINK_MERKEZ.linkId}/appointments`);

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    function expectList(scope: string, pageNo: number): TestRequest {
        const req = http.expectOne((r) => r.url === listUrl);

        expect(req.request.params.get('scope')).toBe(scope);
        expect(req.request.params.get('page')).toBe(String(pageNo));
        expect(req.request.params.get('pageSize')).toBe('20');

        return req;
    }

    async function create(scope?: string): Promise<void> {
        configurePortalPage(PortalAppointmentsComponent, createSessionStub());
        http = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(PortalAppointmentsComponent);
        el = fixture.nativeElement;

        if (scope) {
            fixture.componentRef.setInput('scope', scope);
        }

        await settle();
    }

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('varsayılan sekme "Yaklaşan"; yüklenirken iskelet, sonra tarih/saat, hayvan, tür ve durum rozetleri', async () => {
        await create();
        expect(el.querySelector('portal-skeleton')).not.toBeNull();
        expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain('Yaklaşan');

        expectList('upcoming', 1).flush(
            page([
                appointment(),
                appointment({ appointmentId: 'ap-2', status: 'Cancelled', appointmentType: 'Other' }),
                appointment({ appointmentId: 'ap-3', status: 'NoShow', appointmentType: 'Checkup' })
            ])
        );
        await settle();

        const rows = el.querySelectorAll('[data-testid=appointment-list] li');

        expect(rows.length).toBe(3);
        expect(rows[0].textContent).toContain('Pazartesi, 19.10.2026 · 08:48');
        expect(rows[0].textContent).toContain('Pamuk · Aşı · 30 dk');
        expect(rows[0].textContent).toContain('Planlandı');
        expect(rows[1].textContent).toContain('İptal edildi');
        expect(rows[2].textContent).toContain('Gelinmedi');
        // Tek klinik: klinik adı satırlarda yazılmaz.
        expect(el.textContent).not.toContain('Merkez');
    });

    it('geçmiş sekmesi scope=past ister; sekme değişimi adres çubuğuna yazılır', async () => {
        await create('past');
        expectList('past', 1).flush(page([]));
        await settle();

        expect(el.querySelector('[role=tab][aria-selected=true]')?.textContent).toContain('Geçmiş');
        expect(el.textContent).toContain('Son 12 ayda geçmiş randevunuz yok.');

        buttonByText(el, 'Yaklaşan')!.click();
        expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { scope: null }, replaceUrl: true });

        fixture.componentRef.setInput('scope', undefined);
        await settle();
        expectList('upcoming', 1).flush(page([]));
        await settle();

        expect(el.textContent).toContain('Yaklaşan randevunuz yok.');
    });

    it('sayfalama: "Daha fazla göster" sonraki sayfayı ekler, son sayfada düğme kalkar', async () => {
        await create();
        const first = Array.from({ length: 20 }, (_, i) => appointment({ appointmentId: `a-${i}` }));

        expectList('upcoming', 1).flush(page(first, 1, 2, 21));
        await settle();

        expect(el.textContent).toContain('21 randevudan 20 tanesi gösteriliyor');
        buttonByText(el, 'Daha fazla göster')!.click();
        await settle();
        expectList('upcoming', 2).flush(page([appointment({ appointmentId: 'a-20' })], 2, 2, 21));
        await settle();

        expect(el.querySelectorAll('[data-testid=appointment-list] li').length).toBe(21);
        expect(buttonByText(el, 'Daha fazla göster')).toBeUndefined();
    });

    it('farklı klinikteki (şube) randevuda klinik adı her satırda yazılır', async () => {
        await create();
        expectList('upcoming', 1).flush(page([appointment(), appointment({ appointmentId: 'x', clinicId: 'clinic-9', clinicName: 'Şube' })]));
        await settle();

        const rows = el.querySelectorAll('[data-testid=appointment-list] li');

        expect(rows[0].textContent).toContain('Merkez');
        expect(rows[1].textContent).toContain('Şube');
    });

    it('hata durumunda mesaj ve "Tekrar dene"', async () => {
        await create();
        expectList('upcoming', 1).flush(null, { status: 500, statusText: 'Error' });
        await settle();

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_SERVER_ERROR_MESSAGE);
        buttonByText(el, 'Tekrar dene')!.click();
        await settle();
        expectList('upcoming', 1).flush(page([appointment()]));
        await settle();

        expect(el.querySelectorAll('[data-testid=appointment-list] li').length).toBe(1);
    });
});

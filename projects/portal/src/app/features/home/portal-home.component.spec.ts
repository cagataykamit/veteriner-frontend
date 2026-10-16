import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import {
    appointment,
    BALANCE,
    BALANCE_CLEAR,
    configurePortalPage,
    createSessionStub,
    LINK_MERKEZ,
    LINK_SAHIL,
    page,
    PET_BONCUK,
    PET_PAMUK,
    PortalSessionStub,
    url,
    VACCINATIONS_PAMUK
} from '@portal/app/testing/portal-fixtures';
import { PortalHomeComponent } from './portal-home.component';

describe('PortalHomeComponent (ana ekran)', () => {
    let fixture: ComponentFixture<PortalHomeComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;
    let session: PortalSessionStub;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function create(stub = createSessionStub()): Promise<void> {
        session = stub;
        configurePortalPage(PortalHomeComponent, session);
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalHomeComponent);
        el = fixture.nativeElement;
        await settle();
    }

    /** Bağın dört kart isteğini (hayvanlar, randevu, bakiye; ardından aşılar) yanıtlar. */
    async function respondAll(linkId = LINK_MERKEZ.linkId, balance = BALANCE): Promise<void> {
        http.expectOne(url(`links/${linkId}/pets`)).flush([PET_PAMUK, PET_BONCUK]);
        const ap = http.expectOne((r) => r.url === url(`links/${linkId}/appointments`));

        expect(ap.request.params.get('scope')).toBe('upcoming');
        expect(ap.request.params.get('page')).toBe('1');
        ap.flush(page([appointment({ status: 'Cancelled', appointmentId: 'c' }), appointment()]));
        http.expectOne(url(`links/${linkId}/balance`)).flush(balance);
        await settle();
        // Yalnız etkin hayvanın aşıları istenir; vefat eden için istek yok.
        http.expectOne(url(`links/${linkId}/pets/${PET_PAMUK.petId}/vaccinations`)).flush(VACCINATIONS_PAMUK);
        await settle();
    }

    afterEach(() => {
        http?.verify();
        fixture?.destroy();
    });

    it('yüklenirken iskelet gösterir ve kartlar ilgili sayfaya gider', async () => {
        await create();

        expect(el.querySelectorAll('portal-skeleton').length).toBeGreaterThan(0);
        expect(el.querySelector('[data-testid=home-clinic]')?.textContent).toContain('Merkez');

        await respondAll();

        expect(el.querySelector('portal-skeleton')).toBeNull();
        expect(el.querySelector('[data-testid=home-clinic]')?.getAttribute('href')).toBe('/clinic');
        expect(el.querySelector('[data-testid=home-appointment]')?.getAttribute('href')).toBe('/appointments');
        expect(el.querySelector('[data-testid=home-balance]')?.getAttribute('href')).toBe('/balance');
    });

    it('en yakın planlı randevuyu, gecikmiş aşıyı, kalan tutarı ve hayvanları gösterir', async () => {
        await create();
        await respondAll();

        const ap = el.querySelector('[data-testid=home-appointment]')!.textContent!;

        expect(ap).toContain('Pazartesi, 19.10.2026 · 08:48');
        expect(ap).toContain('Pamuk · Aşı');

        const overdue = el.querySelector('[data-testid=home-vaccine-overdue]')!;

        expect(overdue.textContent).toContain('Gecikmiş aşı');
        expect(overdue.textContent).toContain('Pamuk · Karma');
        expect(overdue.textContent).toContain('13.10.2026');
        expect(overdue.getAttribute('href')).toBe(`/pets/${PET_PAMUK.petId}`);

        expect(el.querySelector('[data-testid=home-balance]')!.textContent!.replace(/\s/g, '')).toContain('Kalantutar₺500,00');
        expect(el.textContent).toContain('Boncuk');
        expect(el.textContent).toContain('Vefat etti');
    });

    it('borç yoksa "Borcunuz yok"; gecikmiş aşı yoksa sıradaki aşı sakin kartta', async () => {
        await create();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([PET_PAMUK]);
        http.expectOne((r) => r.url === url(`links/${LINK_MERKEZ.linkId}/appointments`)).flush(page([]));
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/balance`)).flush(BALANCE_CLEAR);
        await settle();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets/${PET_PAMUK.petId}/vaccinations`)).flush({ history: [], upcoming: [VACCINATIONS_PAMUK.upcoming[1]] });
        await settle();

        expect(el.querySelector('[data-testid=home-balance]')?.textContent).toContain('Borcunuz yok');
        expect(el.querySelector('[data-testid=home-vaccine-overdue]')).toBeNull();
        expect(el.querySelector('[data-testid=home-vaccine]')?.textContent).toContain('Pamuk · Kuduz');
        expect(el.querySelector('[data-testid=home-appointment]')?.textContent).toContain('Yaklaşan randevunuz yok');
    });

    it('hayvan yoksa boş durum metni gösterir ve aşı isteği atmaz', async () => {
        await create();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([]);
        http.expectOne((r) => r.url === url(`links/${LINK_MERKEZ.linkId}/appointments`)).flush(page([]));
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/balance`)).flush(BALANCE_CLEAR);
        await settle();

        expect(el.textContent).toContain('Kayıtlı hayvanınız yok');
        expect(el.querySelector('[data-testid=home-vaccine]')?.textContent).toContain('Planlanmış aşı yok');
    });

    it('bir kart hata verirse yalnız o kart "Tekrar dene" gösterir; tekrar dene isteği yineler', async () => {
        await create();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([]);
        http.expectOne((r) => r.url === url(`links/${LINK_MERKEZ.linkId}/appointments`)).flush(page([]));
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/balance`)).flush(null, { status: 503, statusText: 'Unavailable' });
        await settle();

        const error = el.querySelector('[data-testid=home-balance-error]')!;

        expect(error.textContent).toContain('Bakiye bilgisi alınamadı');
        expect(el.querySelector('[data-testid=home-appointment]')).not.toBeNull();

        error.querySelector('button')!.click();
        await settle();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/balance`)).flush(BALANCE);
        await settle();

        expect(el.querySelector('[data-testid=home-balance-error]')).toBeNull();
        expect(el.querySelector('[data-testid=home-balance]')).not.toBeNull();
    });

    it('erişimi kapatılmış bağda sözleşme mesajını gösterir', async () => {
        await create();
        const notFound = { status: 404, extensions: { code: PORTAL_ERROR_CODES.linkNotFound } };

        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush(notFound, { status: 404, statusText: 'Not Found' });
        http.expectOne((r) => r.url === url(`links/${LINK_MERKEZ.linkId}/appointments`)).flush(notFound, { status: 404, statusText: 'Not Found' });
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/balance`)).flush(notFound, { status: 404, statusText: 'Not Found' });
        await settle();

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.linkNotFound]);
    });

    it('çok klinikli hesapta klinik değişince kartlar yeni bağla yeniden yüklenir', async () => {
        await create(createSessionStub([LINK_MERKEZ, LINK_SAHIL]));
        await respondAll(LINK_MERKEZ.linkId);

        session.activeLink.set(LINK_SAHIL);
        await settle();

        expect(el.querySelector('[data-testid=home-clinic]')?.textContent).toContain('Sahil');
        await respondAll(LINK_SAHIL.linkId, BALANCE_CLEAR);

        expect(el.querySelector('[data-testid=home-balance]')?.textContent).toContain('Borcunuz yok');
    });
});

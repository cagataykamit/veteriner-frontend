import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_SERVER_ERROR_MESSAGE } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import { configurePortalPage, createSessionStub, LINK_MERKEZ, PET_BONCUK, PET_PAMUK, url } from '@portal/app/testing/portal-fixtures';
import { PortalPetsComponent } from './portal-pets.component';

describe('PortalPetsComponent (hayvanlarım)', () => {
    let fixture: ComponentFixture<PortalPetsComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(async () => {
        configurePortalPage(PortalPetsComponent, createSessionStub());
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalPetsComponent);
        el = fixture.nativeElement;
        await settle();
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('yüklenirken iskelet, sonra hayvan kartları (ad, tür, vefat notu) ve detay bağlantısı', async () => {
        expect(el.querySelector('portal-skeleton')).not.toBeNull();

        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([PET_PAMUK, PET_BONCUK]);
        await settle();

        const items = el.querySelectorAll('li');

        expect(items.length).toBe(2);
        expect(items[0].textContent).toContain('Pamuk');
        expect(items[0].textContent).toContain('Kedi · Tekir');
        expect(items[0].textContent).not.toContain('Vefat etti');
        expect(items[1].textContent).toContain('Vefat etti');
        expect(items[0].querySelector('a')?.getAttribute('href')).toBe(`/pets/${PET_PAMUK.petId}`);
    });

    it('boş listede boş durum metni', async () => {
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([]);
        await settle();

        expect(el.textContent).toContain('Kayıtlı hayvanınız yok');
    });

    it('hata durumunda mesaj ve "Tekrar dene"', async () => {
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush(null, { status: 500, statusText: 'Error' });
        await settle();

        expect(el.querySelector('[role=alert]')?.textContent).toContain(PORTAL_SERVER_ERROR_MESSAGE);

        buttonByText(el, 'Tekrar dene')!.click();
        await settle();
        http.expectOne(url(`links/${LINK_MERKEZ.linkId}/pets`)).flush([PET_PAMUK]);
        await settle();

        expect(el.textContent).toContain('Pamuk');
    });
});

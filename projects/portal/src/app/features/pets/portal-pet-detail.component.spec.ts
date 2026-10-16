import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES } from '@portal/app/core/errors/portal-errors';
import { buttonByText } from '@portal/app/testing/portal-testing';
import {
    configurePortalPage,
    createSessionStub,
    LINK_MERKEZ,
    PET_BONCUK_DETAIL,
    PET_PAMUK_DETAIL,
    url,
    VACCINATIONS_BONCUK,
    VACCINATIONS_PAMUK
} from '@portal/app/testing/portal-fixtures';
import { PortalPetDetailComponent } from './portal-pet-detail.component';

describe('PortalPetDetailComponent (hayvan detayı ve aşılar)', () => {
    let fixture: ComponentFixture<PortalPetDetailComponent>;
    let el: HTMLElement;
    let http: HttpTestingController;

    async function settle(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    async function open(petId: string): Promise<void> {
        fixture.componentRef.setInput('petId', petId);
        await settle();
    }

    const petUrl = (petId: string) => url(`links/${LINK_MERKEZ.linkId}/pets/${petId}`);

    beforeEach(() => {
        configurePortalPage(PortalPetDetailComponent, createSessionStub());
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PortalPetDetailComponent);
        el = fixture.nativeElement;
    });

    afterEach(() => {
        http.verify();
        fixture.destroy();
    });

    it('temel bilgileri Türkçe biçimle gösterir; boş alan satırı yazılmaz', async () => {
        await open(PET_PAMUK_DETAIL.petId);
        expect(el.querySelector('portal-skeleton')).not.toBeNull();

        http.expectOne(petUrl(PET_PAMUK_DETAIL.petId)).flush(PET_PAMUK_DETAIL);
        http.expectOne(`${petUrl(PET_PAMUK_DETAIL.petId)}/vaccinations`).flush(VACCINATIONS_PAMUK);
        await settle();

        const info = el.querySelector('.portal-dl')!.textContent!;

        expect(el.querySelector('h1')?.textContent).toContain('Pamuk');
        expect(info).toContain('Dişi');
        expect(info).toContain('01.03.2022');
        expect(info).toContain('4,2 kg');
        expect(info).toContain('Kısırlaştırılmış');
        expect(info).toContain('Evet');
    });

    it('gecikmiş aşı sunucunun isOverdue alanına göre işaretlenir; geçmiş durumlarıyla listelenir', async () => {
        await open(PET_PAMUK_DETAIL.petId);
        http.expectOne(petUrl(PET_PAMUK_DETAIL.petId)).flush(PET_PAMUK_DETAIL);
        http.expectOne(`${petUrl(PET_PAMUK_DETAIL.petId)}/vaccinations`).flush(VACCINATIONS_PAMUK);
        await settle();

        const upcoming = el.querySelectorAll('[data-testid=pet-upcoming] li');

        expect(upcoming.length).toBe(2);
        expect(upcoming[0].querySelector('[data-testid=overdue-badge]')?.textContent).toContain('Gecikmiş');
        expect(upcoming[0].textContent).toContain('Vadesi geçti: 13.10.2026');
        expect(upcoming[1].querySelector('[data-testid=overdue-badge]')).toBeNull();
        expect(upcoming[1].textContent).toContain('Vade: 05.11.2026');

        const history = el.querySelector('[data-testid=pet-history]')!.textContent!;

        expect(history).toContain('İptal edildi');
        expect(history).toContain('Uygulandı');
        expect(history).toContain('Uygulama: 16.09.2026');
    });

    it('vefat eden hayvanda sade not; yaklaşan aşı bölümü ve gecikme işareti yok, geçmiş görünür', async () => {
        await open(PET_BONCUK_DETAIL.petId);
        http.expectOne(petUrl(PET_BONCUK_DETAIL.petId)).flush(PET_BONCUK_DETAIL);
        http.expectOne(`${petUrl(PET_BONCUK_DETAIL.petId)}/vaccinations`).flush(VACCINATIONS_BONCUK);
        await settle();

        expect(el.querySelector('[data-testid=pet-memorial]')?.textContent).toContain('Vefat etti');
        expect(el.textContent).not.toContain('Yaklaşan aşılar');
        expect(el.querySelector('[data-testid=overdue-badge]')).toBeNull();
        expect(el.querySelector('[data-testid=pet-history]')?.textContent).toContain('Kuduz');
    });

    it('aşı kaydı yoksa boş durum metinleri', async () => {
        await open(PET_PAMUK_DETAIL.petId);
        http.expectOne(petUrl(PET_PAMUK_DETAIL.petId)).flush(PET_PAMUK_DETAIL);
        http.expectOne(`${petUrl(PET_PAMUK_DETAIL.petId)}/vaccinations`).flush({ history: [], upcoming: [] });
        await settle();

        expect(el.textContent).toContain('Planlanmış aşı yok.');
        expect(el.textContent).toContain('Henüz aşı kaydı yok.');
    });

    it('başka müşterinin hayvanı (404) sözleşme mesajıyla; aşı hatası ayrı tekrar denenir', async () => {
        await open('baska');
        http.expectOne(petUrl('baska')).flush({ status: 404, extensions: { code: PORTAL_ERROR_CODES.petNotFound } }, { status: 404, statusText: 'Not Found' });
        http.expectOne(`${petUrl('baska')}/vaccinations`).flush(null, { status: 404, statusText: 'Not Found' });
        await settle();

        expect(el.textContent).toContain(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.petNotFound]);

        await open(PET_PAMUK_DETAIL.petId);
        http.expectOne(petUrl(PET_PAMUK_DETAIL.petId)).flush(PET_PAMUK_DETAIL);
        http.expectOne(`${petUrl(PET_PAMUK_DETAIL.petId)}/vaccinations`).error(new ProgressEvent('error'));
        await settle();

        expect(el.textContent).toContain('Sunucuya ulaşılamadı');
        buttonByText(el, 'Tekrar dene')!.click();
        await settle();
        http.expectOne(`${petUrl(PET_PAMUK_DETAIL.petId)}/vaccinations`).flush(VACCINATIONS_PAMUK);
        await settle();

        expect(el.querySelectorAll('[data-testid=pet-upcoming] li').length).toBe(2);
    });
});
